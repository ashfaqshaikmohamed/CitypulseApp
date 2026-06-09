# FILE: backend/app/api/auth.py
# ROLE: Handles Google OAuth token verification and user session management

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
import httpx
import jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Auth"])

class TokenVerifyRequest(BaseModel):
    token: str

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    jwt_token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(jwt_token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except Exception as e:
        logger.warning(f"JWT decode failure: {e}")
        raise HTTPException(status_code=401, detail="Invalid session token")

@router.post("/verify-google-token")
async def verify_google_token(body: TokenVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Verifies GSI tokeninfo with Google, upserts user in database, and generates JWT.
    """
    token = body.token
    if not token:
        raise HTTPException(status_code=400, detail="ID Token is required")

    # 1. Verify token with Google
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
            if response.status_code != 200:
                logger.error(f"Google tokeninfo validation failed with status {response.status_code}: {response.text}")
                raise HTTPException(status_code=401, detail="Invalid Google authentication token")
            data = response.json()
    except Exception as e:
        logger.exception(f"Error calling Google OAuth verification: {e}")
        raise HTTPException(status_code=401, detail="Failed to verify identity with Google")

    if "error" in data or "sub" not in data:
        logger.error(f"Google tokeninfo response contains error: {data}")
        raise HTTPException(status_code=401, detail="Invalid Google authentication payload")

    google_id = data["sub"]
    email = data.get("email", "")
    name = data.get("name", "")
    avatar_url = data.get("picture", "")

    # 2. Upsert user in DB using postgres insert ... on conflict ... returning
    user_uuid = uuid.uuid4()
    upsert_query = """
        INSERT INTO users (id, google_id, email, name, avatar_url, created_at, digest_opt_in, verified)
        VALUES (:id, :google_id, :email, :name, :avatar_url, NOW(), true, true)
        ON CONFLICT (google_id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            avatar_url = EXCLUDED.avatar_url,
            last_seen_at = NOW()
        RETURNING id, email, name, avatar_url
    """
    try:
        res = await db.execute(
            text(upsert_query),
            {
                "id": user_uuid,
                "google_id": google_id,
                "email": email,
                "name": name,
                "avatar_url": avatar_url
            }
        )
        row = res.fetchone()
        if row:
            db_id = row[0]
            db_email = row[1]
            db_name = row[2]
            db_avatar_url = row[3]
        else:
            db_id = user_uuid
            db_email = email
            db_name = name
            db_avatar_url = avatar_url
        await db.commit()
    except Exception as db_err:
        logger.exception(f"Error upserting Google authentication user: {db_err}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Database failure caching user identity")

    # 3. Generate JWT
    iat = datetime.now(timezone.utc)
    exp = iat + timedelta(days=30)
    payload = {
        "sub": str(db_id),
        "email": db_email,
        "name": db_name,
        "exp": int(exp.timestamp())
    }
    jwt_token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    return {
        "token": jwt_token,
        "user": {
            "id": str(db_id),
            "email": db_email,
            "name": db_name,
            "avatar_url": db_avatar_url
        }
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Return currently logged in user info.
    """
    user_id = current_user.get("sub")
    if not user_id:
         raise HTTPException(status_code=401, detail="Invalid token subject")
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token format")

    try:
        res = await db.execute(
            text("SELECT id, email, name, avatar_url FROM users WHERE id = :id"),
            {"id": user_uuid}
        )
        row = res.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Active user account not found")
        
        return {
            "id": str(row[0]),
            "email": row[1],
            "name": row[2],
            "avatar_url": row[3]
        }
    except Exception as db_err:
        logger.exception(f"Database error querying profile: {db_err}")
        raise HTTPException(status_code=500, detail="Failed to retrieve current user details")

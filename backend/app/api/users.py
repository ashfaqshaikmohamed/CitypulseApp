# FILE: backend/app/api/users.py
# ROLE: Router defining FastAPI endpoints for user registrations, geocoded postcodes, verify email confirmation, and subscription preferences.

import logging
import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import httpx

from app.core.database import get_db
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Users"])

class UserRegister(BaseModel):
    email: str
    zip_code: str

class PreferencesUpdate(BaseModel):
    digest_opt_in: bool


@router.post("/register")
async def register_user(
    body: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new active citizen. Reverse geocodes zip code into lat/lng via Mapbox, 
    and issues an email verification link using Resend.
    """
    logger.info(f"Attempting user registration for email '{body.email}' with zip-code '{body.zip_code}'")

    email_clean = body.email.strip().lower()
    zip_clean = body.zip_code.strip()

    # 1. Check if user already exists
    exist_check = await db.execute(
        text("SELECT id, verified FROM users WHERE email = :email"),
        {"email": email_clean}
    )
    user_row = exist_check.fetchone()
    if user_row:
        logger.info(f"User '{email_clean}' already registered in system. Skipping registration.")
        return {"message": "Already registered"}

    # 2. Reverse geocode postcode with Mapbox
    lat = None
    lng = None
    if settings.MAPBOX_TOKEN:
        try:
            url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{zip_clean}.json"
            params = {
                "country": "us",
                "types": "postcode",
                "access_token": settings.MAPBOX_TOKEN
            }
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params=params, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    features = data.get("features", [])
                    if features:
                        # Extract coordinates point (long, lat) from mapbox response
                        center = features[0].get("center", [])
                        if len(center) == 2:
                            lng = float(center[0])
                            lat = float(center[1])
                            logger.info(f"Zip-code {zip_clean} geocoded to coordinates ({lat}, {lng})")
                else:
                    logger.error(f"Mapbox reverse geocoding API failed: {resp.text}")
        except Exception as geocode_ex:
            logger.error(f"Mapbox API geo lookup encountered exception: {geocode_ex}")
    else:
        logger.warning("MAPBOX_TOKEN is not configured. User registered without coordinates.")

    verify_token = str(uuid.uuid4())
    user_id = uuid.uuid4()

    # 3. Create user entry in database
    insert_sql = """
        INSERT INTO users (
            id, email, zip_code, lat, lng, digest_opt_in, verified, verify_token, created_at
        )
        VALUES (
            :id, :email, :zip_code, :lat, :lng, true, false, :token, NOW()
        )
    """
    params = {
        "id": user_id,
        "email": email_clean,
        "zip_code": zip_clean,
        "lat": lat,
        "lng": lng,
        "token": verify_token
    }

    try:
        await db.execute(text(insert_sql), params)
        await db.commit()
    except Exception as db_ex:
        logger.exception(f"Failed committing new citizen profile to DB: {db_ex}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed registering citizen account inside database.")

    # 4. Deliver verification email with Resend
    verify_link = f"{settings.FRONTEND_URL}/verify?token={verify_token}"
    
    if settings.RESEND_API_KEY:
        try:
            email_payload = {
                "from": settings.EMAIL_FROM,
                "to": [email_clean],
                "subject": "Verify your CityPulse account",
                "html": f"""
                <!DOCTYPE html>
                <html>
                <body style="background-color: #040d1a; color: #e8edf5; font-family: sans-serif; padding: 24px; margin: 0;">
                  <div style="max-width: 500px; margin: 0 auto; background-color: #0b1526; padding: 32px; border-radius: 8px; border: 1px solid #1a2a40;">
                    
                    <h1 style="color: #3b82f6; margin-top: 0; font-size: 22px; font-weight: 700;">Verify Your CityPulse Account</h1>
                    <p style="font-size: 15px; color: #cbd5e1; line-height: 1.5; margin-bottom: 24px;">
                      Welcome to CityPulse! You are registering to receive localized weekly 311 accountability updates and incident digests based in your neighborhood.
                    </p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="{verify_link}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; border: 1px solid #2563eb;">
                        Confirm My Email
                      </a>
                    </div>
                    
                    <p style="font-size: 13px; color: #64748b; line-height: 1.4; margin-top: 32px; border-top: 1px solid #1a2a40; padding-top: 16px;">
                      If you did not execute this registration request, please ignore or delete this newsletter invitation.
                    </p>
                    
                  </div>
                </body>
                </html>
                """
            }

            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    json=email_payload,
                    headers={
                        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    timeout=10.0
                )
                if res.status_code not in (200, 201):
                    logger.error(f"Resend backend rejected email delivery ({res.status_code}): {res.text}")
        except Exception as email_ex:
            logger.error(f"Failed delivering account verification package: {email_ex}")
    else:
        logger.warning(f"RESEND_API_KEY is not defined. Account ready. Verification Token: {verify_token}")

    return {"message": "Check your email to verify your account"}


@router.get("/verify")
async def verify_user(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Receives verification callback tokens, matches to records internally, and activates user digest flags.
    """
    logger.info(f"Incoming email verification audit for Token: {token}")

    # Find matching token
    select_sql = "SELECT id, email FROM users WHERE verify_token = :token"
    res = await db.execute(text(select_sql), {"token": token})
    row = res.fetchone()
    if not row:
        logger.warning(f"Registration verification failed. Token '{token}' not recognized.")
        raise HTTPException(status_code=404, detail="Email verification token invalid or expired.")

    # Update state
    user_id = row.id
    update_sql = "UPDATE users SET verified = true, verify_token = NULL WHERE id = :id"
    
    try:
        await db.execute(text(update_sql), {"id": user_id})
        await db.commit()
        logger.info(f"Citizen email verified for ID: {user_id} ({row.email})")
    except Exception as db_ex:
        logger.exception(f"Failed writing verification status to DB: {db_ex}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Database error committing account activation.")

    return {"message": "Email verified! You'll receive weekly digests."}


@router.put("/preferences")
async def update_preferences(
    body: PreferencesUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Modifies digest opt-in rules. Relies on user_email header input since authentication is simple.
    """
    email = (
        request.headers.get("user-email") or 
        request.headers.get("user_email") or 
        request.headers.get("User-Email") or 
        request.headers.get("User_Email")
    )
    if not email:
        logger.warning("Attempted preferences edit without delivering lookup header 'user-email'")
        raise HTTPException(status_code=401, detail="Header 'user-email' or 'user_email' targeting specific account is required.")

    email_clean = email.strip().lower()
    logger.info(f"Modifying newsletter subscription for: {email_clean} to state: {body.digest_opt_in}")

    # Look up user existence
    select_sql = "SELECT id FROM users WHERE email = :email"
    res = await db.execute(text(select_sql), {"email": email_clean})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="CityPulse user matching header email not found.")

    # Update preferences
    update_sql = "UPDATE users SET digest_opt_in = :opt_in WHERE id = :id"
    try:
        await db.execute(text(update_sql), {"opt_in": body.digest_opt_in, "id": row.id})
        await db.commit()
    except Exception as db_ex:
        logger.exception(f"Failed updating newsletter pref for user {row.id}: {db_ex}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed updating subscription state inside datastore.")

    return {"message": "Preferences updated"}

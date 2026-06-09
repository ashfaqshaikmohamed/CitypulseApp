# FILE: backend/app/services/vision_pipeline.py
# ROLE: Core vision processing service for analyzing user-submitted city issue photos, generating category/description via Gemini, geocoding with Mapbox, and uploading to R2.

import os
import json
import base64
import logging
from io import BytesIO
from uuid import uuid4
from typing import Optional
from pydantic import BaseModel
import httpx
from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)

class VisionResult(BaseModel):
    category: str
    description: str
    severity: str
    confidence: float
    photo_url: str
    address: str
    zip_code: str

async def analyze(image_bytes: bytes, lat: float, lng: float) -> VisionResult:
    """
    Analyzes an upload complaint image:
    1. Resizes if exceeds 4MB
    2. Sends to Gemini Pro Vision for categorizing if settings.VISION_MOCK is False
    3. Performs reverse-geocoding via Mapbox
    4. Uploads image to Cloudflare R2 storage
    """
    logger.info(f"Starting photo analysis pipeline at coordinates ({lat}, {lng})")

    # 1. Check settings.VISION_MOCK — if true return mock immediately
    if settings.VISION_MOCK:
        logger.info("VISION_MOCK is Enabled. Returning pre-configured mock category and description.")
        return VisionResult(
            category="pothole",
            description="A large pothole approximately 2 feet in diameter.",
            severity="medium",
            confidence=0.95,
            photo_url="",
            address="Mock Address, New York, NY",
            zip_code="10001"
        )

    # 2. Resize image if > 4MB using Pillow
    if len(image_bytes) > 4 * 1024 * 1024:
        logger.info(f"Input image occupies {len(image_bytes)} bytes. Compressing below 4MB limit.")
        try:
            img = Image.open(BytesIO(image_bytes))
            img.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
            out = BytesIO()
            img.save(out, format="JPEG", quality=85)
            image_bytes = out.getvalue()
            logger.info(f"Compressed image successfully to {len(image_bytes)} bytes.")
        except Exception as resize_err:
            logger.error(f"Failed compress operation on input image: {resize_err}")

    # 3. Call Gemini 1.5 Flash REST API
    category = "other"
    description = "Unclassified issue."
    severity = "low"
    confidence = 0.5

    if settings.GEMINI_API_KEY:
        try:
            base64_encoded_image = base64.b64encode(image_bytes).decode("utf-8")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            
            prompt = (
                "You are a 311 complaint classifier. Analyze the image and respond with valid JSON only, no markdown. "
                "Schema: {category: one of [pothole,streetlight,noise,graffiti,illegal_dumping,rodent,code_violation,other], "
                "description: string max 80 words professional 311 complaint description, "
                "severity: low|medium|high, confidence: float 0-1}"
            )

            payload = {
                "contents": [{
                    "parts": [
                        { "text": prompt },
                        { "inline_data": { "mime_type": "image/jpeg", "data": base64_encoded_image } }
                    ]
                }]
            }

            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, timeout=20.0)
                if resp.status_code == 200:
                    data = resp.json()
                    try:
                        text_response = data['candidates'][0]['content']['parts'][0]['text']
                        # Stripe markdown formatting
                        cleaned_text = text_response.strip()
                        if cleaned_text.startswith("```json"):
                            cleaned_text = cleaned_text[7:]
                        elif cleaned_text.startswith("```"):
                            cleaned_text = cleaned_text[3:]
                        if cleaned_text.endswith("```"):
                            cleaned_text = cleaned_text[:-3]
                        cleaned_text = cleaned_text.strip()
                        
                        parsed = json.loads(cleaned_text)
                        category = parsed.get("category", "other")
                        description = parsed.get("description", "Unclassified issue.")
                        severity = parsed.get("severity", "low")
                        confidence = float(parsed.get("confidence", 0.5))
                    except Exception as parse_ex:
                        logger.error(f"Error parsing Gemini response '{text_response}': {parse_ex}")
                else:
                    logger.error(f"Gemini API returned status {resp.status_code}: {resp.text}")
        except Exception as gemini_ex:
            logger.exception(f"Unexpected error communicating with Gemini API: {gemini_ex}")
    else:
        logger.warning("GEMINI_API_KEY is not defined. Falling back to default category values.")

    # 4. Reverse geocode lat/lng with Mapbox
    address = "Mock Address, New York, NY"
    zip_code = "10001"
    
    if settings.MAPBOX_TOKEN:
        try:
            url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json"
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params={"access_token": settings.MAPBOX_TOKEN, "limit": 1}, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    features = data.get("features", [])
                    if features:
                        address = features[0].get("place_name", address)
                        for ctx in features[0].get("context", []):
                            if "postcode" in ctx.get("id", ""):
                                zip_code = ctx.get("text", zip_code)
                    logger.info(f"Mapbox reverse geocoding resolved address: '{address}', zip: '{zip_code}'")
                else:
                    logger.error(f"Mapbox API returned status {resp.status_code}: {resp.text}")
        except Exception as mapbox_ex:
            logger.error(f"Failed reverse geocoding step with Mapbox: {mapbox_ex}")
    else:
        logger.warning("MAPBOX_TOKEN is not defined. Relying on fallback geocoding values.")

    # 5. Upload photo to Cloudflare R2 using boto3
    photo_url = ""
    photo_uuid = str(uuid4())
    key = f"photos/{photo_uuid}.jpg"

    if settings.CLOUDFLARE_ACCOUNT_ID and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY and settings.R2_BUCKET_NAME:
        try:
            import boto3
            s3_client = boto3.client(
                "s3",
                endpoint_url=f"https://{settings.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            )
            
            # Execute standard s3 file put operation
            s3_client.put_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=key,
                Body=image_bytes,
                ContentType="image/jpeg"
            )
            
            if settings.R2_PUBLIC_URL:
                photo_url = f"{settings.R2_PUBLIC_URL.rstrip('/')}/{key}"
            else:
                photo_url = f"https://pub-mock.r2.dev/{key}"
                
            logger.info(f"Image uploaded successfully to Cloudflare R2 bucket. Public direct URL: {photo_url}")
        except Exception as r2_ex:
            logger.error(f"Target storage Cloudflare R2 upload failed: {r2_ex}")
    else:
        logger.warning("Cloudflare R2 keys missing in configuration. Skipping photo binary uploads.")

    return VisionResult(
        category=category,
        description=description,
        severity=severity,
        confidence=confidence,
        photo_url=photo_url,
        address=address,
        zip_code=zip_code
    )

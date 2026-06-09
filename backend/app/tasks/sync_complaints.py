# FILE: backend/app/tasks/sync_complaints.py
# ROLE: Defines Celery tasks for municipal 311 data synchronization, spatial clustering, sending weekly digests, and audit checking resolution disputes.

import os
import sys
import logging
import asyncio
from datetime import datetime, timedelta, timezone
import psycopg2
from psycopg2.extras import RealDictCursor
import redis

# Load celery application and configurations
from app.celery_app import celery_app
from app.core.config import settings
from app.services.city_adapters import AdapterFactory

logger = logging.getLogger(__name__)

def get_db_connection():
    """
    Creates a synchronous psycopg2 connection using the configured DATABASE_URL.
    Converts asyncpg connection string scheme to psycopg2-compatible scheme.
    """
    # 1. Adhere to instruction: replace 'postgresql+asyncpg' with 'postgresql+psycopg2'
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql+psycopg2")
    
    # 2. Cleanup '+psycopg2' protocol segment to ensure Python psycopg2 driver compatibility
    cleaned_url = db_url.replace("postgresql+psycopg2://", "postgresql://")
    return psycopg2.connect(cleaned_url)


@celery_app.task(name="app.tasks.sync_complaints.sync_city_complaints")
def sync_city_complaints(city_id: str):
    """
    Task 1: Synchronizes 311 open data complaints for a specific city.
    """
    logger.info(f"Starting civic data sync for City ID: {city_id}")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Load city details
            cur.execute("SELECT id, name, api_type, active FROM cities WHERE id = %s", (city_id,))
            row = cur.fetchone()
            if not row:
                logger.error(f"City synchronization aborted: City ID '{city_id}' not found.")
                return
            
            city_name = row[1]
            api_type = row[2]
            active = row[3]
            
            if not active:
                logger.info(f"City '{city_name}' is currently flagged inactive. Skipping sync.")
                return
            
            # Setup city adapter
            try:
                adapter = AdapterFactory.get(api_type)
            except Exception as e:
                logger.error(f"Could not initialize 311 adapter for API Type '{api_type}': {e}")
                return
            
            # Fetch complaints filed in the last 24 hours (limit 500)
            since = datetime.utcnow() - timedelta(days=3)
            logger.info(f"Fetching {city_name} 311 reports since {since.isoformat()}...")
            
            try:
                # Use asyncio.run to execute the async fetch inside our synchronous worker context
                complaints = asyncio.run(adapter.fetch_recent_complaints(since=since, limit=500))
            except Exception as e:
                logger.error(f"Async adapter fetch call encountered an unexpected exception: {e}")
                return

            new_count = 0
            updated_count = 0

            # Core batch insertion/upsert
            for comp in complaints:
                if comp.lat is None or comp.lng is None:
                    continue
                
                try:
                    cur.execute("""
                        INSERT INTO complaints (
                            id, city_id, external_id, category, subcategory,
                            description, status, location, address, zip_code, neighborhood, 
                            filed_at, closed_at, source
                        )
                        VALUES (
                            gen_random_uuid(), %(city_id)s, %(external_id)s, %(category)s, 
                            %(subcategory)s, %(description)s, %(status)s,
                            ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326),
                            %(address)s, %(zip_code)s, %(neighborhood)s, %(filed_at)s, %(closed_at)s, 'city_api_sync'
                        )
                        ON CONFLICT (city_id, external_id) 
                        DO UPDATE SET status=EXCLUDED.status, closed_at=EXCLUDED.closed_at
                        RETURNING (xmax = 0);
                    """, {
                        "city_id": city_id,
                        "external_id": comp.external_id,
                        "category": comp.category or "other",
                        "subcategory": comp.subcategory,
                        "description": comp.description,
                        "status": comp.status or "open",
                        "lng": comp.lng,
                        "lat": comp.lat,
                        "address": comp.address,
                        "zip_code": comp.zip_code,
                        "neighborhood": comp.neighborhood,
                        "filed_at": comp.filed_at,
                        "closed_at": comp.closed_at
                    })
                    
                    is_insert = cur.fetchone()[0]
                    if is_insert:
                        new_count += 1
                    else:
                        updated_count += 1
                    
                    # Commit individually to maintain stability and prevent poisoning batch on single error
                    conn.commit()
                except Exception as ex:
                    logger.warning(f"Error occurred during raw upsert of complaint ext_id '{comp.external_id}': {ex}")
                    conn.rollback()
                    continue

            logger.info(f"Synced {new_count} new, {updated_count} updated complaints for {city_name}")
            
            # Enqueue asynchronous spatial cluster re-building for this city
            update_clusters.delay(city_id)

    except Exception as e:
        logger.exception(f"Unhandled error during sync_city_complaints workflow: {e}")
        conn.rollback()
    finally:
        conn.close()


@celery_app.task(name="app.tasks.sync_complaints.update_clusters")
def update_clusters(city_id: str):
    """
    Task 2: Finds spatial concentrations of open complaints using DBSCAN and updates the clusters table.
    """
    logger.info(f"Recalculating DBSCAN spatial clusters for City ID: {city_id}...")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Run the PostGIS spatial cluster search
            cur.execute("""
                WITH clustered AS (
                  SELECT id, ST_ClusterDBSCAN(location::geometry, eps := 0.0015, 
                         minpoints := 2) OVER () AS cid
                  FROM complaints
                  WHERE city_id = %(city_id)s AND status = 'open' 
                  AND location IS NOT NULL
                )
                SELECT cid, COUNT(*) as cnt,
                       ST_AsText(ST_Centroid(ST_Union(location::geometry))) as centroid_wkt,
                       MIN(filed_at) as oldest,
                       array_agg(id::text) as complaint_ids
                FROM clustered 
                WHERE cid IS NOT NULL 
                GROUP BY cid
            """, {"city_id": city_id})
            
            cluster_results = cur.fetchall()
            
            # 1. Clear current cluster references from all complaints in this city
            cur.execute("""
                UPDATE complaints 
                SET cluster_id = NULL 
                WHERE city_id = %s AND cluster_id IS NOT NULL
            """, (city_id,))
            conn.commit()
            
            new_cluster_ids = []
            
            # 2. Iterate through discovered DBSCAN densities and upsert clusters
            for row in cluster_results:
                cid = row[0]
                cnt = row[1]
                centroid_wkt = row[2]
                oldest = row[3]
                complaint_ids = row[4]
                
                if not complaint_ids:
                    continue
                
                # Fetch dominant category among IDs grouped inside this density
                cur.execute("""
                    SELECT category, COUNT(*) as cat_cnt 
                    FROM complaints 
                    WHERE id = ANY(%s) 
                    GROUP BY category 
                    ORDER BY cat_cnt DESC 
                    LIMIT 1
                """, (complaint_ids,))
                cat_row = cur.fetchone()
                dominant_category = cat_row[0] if cat_row else "other"
                
                # Generate unique cluster ID and insert newly formed cluster
                cur.execute("""
                    INSERT INTO clusters (
                        id, city_id, category, centroid, complaint_count, oldest_complaint_at, escalated
                    )
                    VALUES (
                        gen_random_uuid(), %(city_id)s, %(category)s, ST_GeomFromText(%(centroid_wkt)s, 4326), 
                        %(cnt)s, %(oldest)s, false
                    )
                    RETURNING id;
                """, {
                    "city_id": city_id,
                    "category": dominant_category,
                    "centroid_wkt": centroid_wkt,
                    "cnt": cnt,
                    "oldest": oldest
                })
                
                new_cluster_uuid = cur.fetchone()[0]
                new_cluster_ids.append(new_cluster_uuid)
                
                # Map complaints in this cluster to the newly generated database cluster ID
                cur.execute("""
                    UPDATE complaints 
                    SET cluster_id = %s 
                    WHERE id = ANY(%s)
                """, (new_cluster_uuid, complaint_ids))
                
                conn.commit()

            # 3. Clean up older clusters no longer part of active concentrations
            if new_cluster_ids:
                cur.execute("""
                    DELETE FROM clusters 
                    WHERE city_id = %(city_id)s AND id NOT IN %(new_ids)s
                """, {"city_id": city_id, "new_ids": tuple(new_cluster_ids)})
            else:
                cur.execute("DELETE FROM clusters WHERE city_id = %s", (city_id,))
            
            conn.commit()
            
            # 4. Evict cached clusters representation from Redis cache
            try:
                r_client = redis.from_url(settings.REDIS_URL)
                r_client.delete(f"clusters:{city_id}")
            except Exception as redis_err:
                logger.warning(f"Failed to evict Redis cache key clusters:{city_id}: {redis_err}")
                
            logger.info(f"Updated {len(new_cluster_ids)} clusters for city {city_id}")
            
    except Exception as e:
        logger.exception(f"Unhandled error in update_clusters: {e}")
        conn.rollback()
    finally:
        conn.close()


@celery_app.task(name="app.tasks.sync_complaints.send_weekly_digests")
def send_weekly_digests():
    """
    Task 3: Compiles and emails localized weekly notifications containing nearby open complaints.
    """
    logger.info("Initializing active citizen weekly digest emails...")
    conn = get_db_connection()
    try:
        users_notified = 0
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Select users signed up for digest notifications
            cur.execute("""
                SELECT id, email, lat, lng FROM users 
                WHERE digest_opt_in = true AND lat IS NOT NULL AND verified = true
            """)
            users = cur.fetchall()
            
            for user in users:
                user_email = user["email"]
                user_lat = user["lat"]
                user_lng = user["lng"]
                
                # Query all active issues inside a 1km radius ordered oldest to newest
                cur.execute("""
                    SELECT id, category, subcategory, description, address, filed_at 
                    FROM complaints 
                    WHERE ST_DWithin(location::geography, ST_Point(%(lng)s, %(lat)s)::geography, 1000)
                    AND status = 'open'
                    ORDER BY filed_at ASC
                """, {"lng": user_lng, "lat": user_lat})
                
                complaints = cur.fetchall()
                if not complaints:
                    continue  # Skip emailing if no localized incidents reported
                
                # Group issues by standardized categories
                grouped_complaints = {}
                for comp in complaints:
                    cat = comp["category"] or "other"
                    if cat not in grouped_complaints:
                        grouped_complaints[cat] = []
                    grouped_complaints[cat].append(comp)
                    
                # Compile stylish styled HTML
                html_context = f"""
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <title>Weekly Civic Digest</title>
                </head>
                <body style="background-color: #040d1a; color: #e8edf5; font-family: sans-serif; margin: 0; padding: 24px; box-sizing: border-box;">
                  <div style="max-width: 600px; margin: 0 auto; background-color: #0b1526; padding: 32px; border-radius: 8px; border: 1px solid #1a2a40;">
                    
                    <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px;">
                      <h1 style="color: #3b82f6; margin: 0; font-size: 24px; font-weight: 700;">CityPulse Weekly Digest</h1>
                      <p style="color: #60a5fa; margin: 4px 0 0 0; font-size: 14px;">Your local neighborhood civic accountability update</p>
                    </div>
                    
                    <p style="font-size: 16px; line-height: 1.5; color: #e8edf5; margin-bottom: 24px;">Hello,</p>
                    <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1; margin-bottom: 24px;">
                      Here are the <strong>{len(complaints)} open complaints</strong> currently reported within 1km of your location:
                    </p>
                """
                
                now = datetime.now(timezone.utc)
                for cat, comps in grouped_complaints.items():
                    category_display = cat.replace("_", " ").title()
                    html_context += f"""
                    <div style="margin-top: 24px; margin-bottom: 12px;">
                      <h2 style="color: #60a5fa; margin: 0 0 12px 0; font-size: 18px; border-bottom: 1px solid #1a2a40; padding-bottom: 4px;">{category_display}</h2>
                    """
                    
                    for comp in comps:
                        addr = comp["address"] or "Unknown Address"
                        desc = comp["description"] or "No description provided."
                        sub_cat = comp["subcategory"] or ""
                        
                        filed_at = comp["filed_at"]
                        if filed_at.tzinfo is None:
                            filed_at = filed_at.replace(tzinfo=timezone.utc)
                        days_open = (now - filed_at).days
                        if days_open < 0:
                            days_open = 0
                            
                        sub_text = f" ({sub_cat})" if sub_cat else ""
                        
                        html_context += f"""
                        <div style="background-color: #111e33; padding: 16px; border-radius: 6px; margin-bottom: 16px; border-left: 4px solid #3b82f6;">
                          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <span style="font-weight: bold; color: #e8edf5; font-size: 15px;">{addr}</span>
                            <span style="background-color: #1e3a8a; color: #3b82f6; font-size: 12px; padding: 2px 8px; border-radius: 12px; font-weight: 600; white-space: nowrap; margin-left: 8px;">{days_open} days open</span>
                          </div>
                          <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.4;">
                            <strong style="color: #cbd5e1;">{sub_text}</strong> {desc}
                          </p>
                        </div>
                        """
                    html_context += "</div>"
                    
                html_context += """
                    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #1a2a40; text-align: center;">
                      <p style="font-size: 12px; color: #64748b; margin: 0;">
                        You received this because you opted in to CityPulse weekly digests for your neighborhood geography.
                      </p>
                    </div>
                    
                  </div>
                </body>
                </html>
                """
                
                # Send email using Resend API (HTTP REST payload)
                if settings.RESEND_API_KEY:
                    try:
                        import httpx
                        headers = {
                            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                            "Content-Type": "application/json"
                        }
                        payload = {
                            "from": settings.EMAIL_FROM,
                            "to": [user_email],
                            "subject": f"CityPulse: {len(complaints)} local civic issues near you",
                            "html": html_context
                        }
                        
                        response = httpx.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10.0)
                        if response.status_code in (200, 201):
                            users_notified += 1
                        else:
                            logger.error(f"Resend backend returned error {response.status_code} writing digest to {user_email}: {response.text}")
                    except Exception as resend_ex:
                        logger.error(f"Failed to post weekly email package to Resend API for user '{user_email}': {resend_ex}")
                else:
                    logger.warning(f"RESEND_API_KEY is unset. Mocking transmission of digest email to {user_email}.")
                    users_notified += 1
                    
        logger.info(f"Sent digest to {users_notified} users")
        
    except Exception as e:
        logger.exception(f"Unhandled error during weekly digest loop: {e}")
    finally:
        conn.close()


@celery_app.task(name="app.tasks.sync_complaints.check_resolution_disputes")
def check_resolution_disputes():
    """
    Task 4: Checks closed complaints without user-provided resolution verifications.
    """
    logger.info("Starting closed complaint audit check...")
    conn = get_db_connection()
    try:
        from psycopg2.extras import RealDictCursor
        total_count = 0
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Guard against absent resolutions relation in current database phase
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'resolutions'
                );
            """)
            has_resolutions_table = cur.fetchone()["exists"]
            
            if has_resolutions_table:
                logger.info("Auditing resolutions table entries on closed tickets...")
                query = """
                    SELECT id, address FROM complaints 
                    WHERE status = 'closed' 
                    AND id NOT IN (
                        SELECT complaint_id FROM resolutions 
                        WHERE confirmed_by_user IS NOT NULL
                    )
                """
            else:
                logger.warning("Resolutions table not yet instantiated in database (Phase 4 scope). Falling back to checking all closed complaints.")
                query = """
                    SELECT id, address FROM complaints 
                    WHERE status = 'closed'
                """
                
            cur.execute(query)
            rows = cur.fetchall()
            
            for row in rows:
                comp_id = row["id"]
                address = row["address"] or "Unknown Address"
                logger.info(f"Unconfirmed resolution: complaint {comp_id} at {address}")
                total_count += 1
                
            logger.info(f"Audit completed successfully: Found {total_count} total unconfirmed resolutions.")
            
    except Exception as e:
        logger.exception(f"Error checking resolution disputes: {e}")
    finally:
        conn.close()


@celery_app.task(name="app.tasks.sync_complaints.sync_nyc_complaints")
def sync_nyc_complaints():
    """
    Cron beat wrapper to trigger complaints sync for all active cities configured with NYC Open Data.
    """
    logger.info("Periodic cron triggered: Syncing all active NYC open data endpoints...")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM cities WHERE api_type = 'nyc_open_data' AND active = true")
            rows = cur.fetchall()
            if not rows:
                logger.info("No active cities found matching 'nyc_open_data' API type.")
                return
            for r in rows:
                city_id = str(r[0])
                logger.info(f"Dispatching sync_city_complaints sync task for City ID: {city_id}")
                sync_city_complaints.delay(city_id)
    except Exception as e:
        logger.exception(f"Error in sync_nyc_complaints beat scheduler: {e}")
    finally:
        conn.close()

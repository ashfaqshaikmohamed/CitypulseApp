# FILE: backend/app/api/escalations.py
# ROLE: Router defining FastAPI endpoints for escalations, generating HTML reports, selecting council members, and updating cluster escalation states.

import logging
import uuid
import base64
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Escalations"])

class EscalationCreate(BaseModel):
    cluster_id: str

# 20 standard New York City zip codes mapping to council members
COUNCIL_DISTRICTS = {
    "10001": { "council_member": "Erik Bottcher", "district": 3, "email": "ebottcher@council.nyc.gov" },
    "10011": { "council_member": "Erik Bottcher", "district": 3, "email": "ebottcher@council.nyc.gov" },
    "10018": { "council_member": "Erik Bottcher", "district": 3, "email": "ebottcher@council.nyc.gov" },
    "10002": { "council_member": "Christopher Marte", "district": 1, "email": "district1@council.nyc.gov" },
    "10003": { "council_member": "Carlina Rivera", "district": 2, "email": "crivera@council.nyc.gov" },
    "10009": { "council_member": "Carlina Rivera", "district": 2, "email": "crivera@council.nyc.gov" },
    "10012": { "council_member": "Christopher Marte", "district": 1, "email": "district1@council.nyc.gov" },
    "10013": { "council_member": "Christopher Marte", "district": 1, "email": "district1@council.nyc.gov" },
    "10014": { "council_member": "Erik Bottcher", "district": 3, "email": "ebottcher@council.nyc.gov" },
    "10019": { "council_member": "Erik Bottcher", "district": 3, "email": "ebottcher@council.nyc.gov" },
    "10025": { "council_member": "Shaun Abreu", "district": 7, "email": "sabreu@council.nyc.gov" },
    "10026": { "council_member": "Kristin Richardson Jordan", "district": 9, "email": "krichardsonjordan@council.nyc.gov" },
    "10027": { "council_member": "Shaun Abreu", "district": 7, "email": "sabreu@council.nyc.gov" },
    "10028": { "council_member": "Julie Menin", "district": 5, "email": "jmenin@council.nyc.gov" },
    "10029": { "council_member": "Diana Ayala", "district": 8, "email": "dayala@council.nyc.gov" },
    "10031": { "council_member": "Shaun Abreu", "district": 7, "email": "sabreu@council.nyc.gov" },
    "10032": { "council_member": "Carmen De La Rosa", "district": 10, "email": "cdelarosa@council.nyc.gov" },
    "10033": { "council_member": "Carmen De La Rosa", "district": 10, "email": "cdelarosa@council.nyc.gov" },
    "10034": { "council_member": "Carmen De La Rosa", "district": 10, "email": "cdelarosa@council.nyc.gov" },
    "10036": { "council_member": "Erik Bottcher", "district": 3, "email": "ebottcher@council.nyc.gov" }
}

FALLBACK_COUNCIL = { "council_member": "City Council Representative", "district": 0, "email": "civic-escalations@council.nyc.gov" }


@router.post("/")
async def escalate_cluster(
    body: EscalationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Formulates a dynamic escalation proposal, hardcodes targeted council members by predominant zip-codes, 
    compiles stylized markdown-compatible dark HTML summaries, and flags cluster as escalated.
    """
    logger.info(f"Filing critical cluster incident escalation for Cluster ID: {body.cluster_id}")

    try:
        cluster_uuid = uuid.UUID(body.cluster_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cluster_id UUID format.")

    # 1. Verify cluster presence
    cluster_res = await db.execute(
        text("SELECT id, city_id, category, complaint_count FROM clusters WHERE id = :id"),
        {"id": cluster_uuid}
    )
    cluster_row = cluster_res.fetchone()
    if not cluster_row:
        raise HTTPException(status_code=404, detail="Target cluster to escalate not found.")

    city_uuid = cluster_row.city_id
    category = cluster_row.category
    complaint_count = cluster_row.complaint_count

    # 2. Extract most common zip_code among complaints grouped under this cluster
    zip_res = await db.execute(
        text("""
            SELECT zip_code, COUNT(*) as cnt
            FROM complaints
            WHERE cluster_id = :cluster_id AND zip_code IS NOT NULL
            GROUP BY zip_code
            ORDER BY cnt DESC
            LIMIT 1
        """),
        {"cluster_id": cluster_uuid}
    )
    zip_row = zip_res.fetchone()
    cluster_zip = zip_row.zip_code if zip_row else "10001"

    # Select council person target
    council_info = COUNCIL_DISTRICTS.get(cluster_zip, FALLBACK_COUNCIL)
    council_member = council_info["council_member"]
    council_member_email = council_info["email"]
    council_district = council_info["district"]

    # 3. Retrieve average closed resolution day metrics for this specific category
    city_avg_res = await db.execute(
        text("""
            SELECT AVG(resolution_days) as category_avg
            FROM complaints
            WHERE city_id = :city_id AND category = :category AND status = 'closed' AND resolution_days IS NOT NULL
        """),
        {"city_id": city_uuid, "category": category}
    )
    city_avg_row = city_avg_res.fetchone()
    city_avg = round(float(city_avg_row.category_avg), 1) if city_avg_row and city_avg_row.category_avg is not None else 14.5 # Standard SLA reference

    # 4. Fetch list of complaints in the cluster to build report table
    complaints_res = await db.execute(
        text("""
            SELECT id, COALESCE(address, 'Unknown address') as address, filed_at, COALESCE(description, 'No details provided.') as description,
                   EXTRACT(DAY FROM (NOW() - filed_at))::integer as days_open
            FROM complaints
            WHERE cluster_id = :cluster_id
            ORDER BY filed_at ASC
        """),
        {"cluster_id": cluster_uuid}
    )
    complaints_list = complaints_res.fetchall()

    if not complaints_list:
        raise HTTPException(status_code=400, detail="Cannot escalate empty cluster of zero active complaints.")

    # 5. Generate Styled Dark HTML escalation letter
    report_date = datetime.now(timezone.utc).strftime("%B %d, %Y")
    
    table_rows = ""
    for idx, comp in enumerate(complaints_list, start=1):
        filed_str = comp.filed_at.strftime("%Y-%m-%d") if comp.filed_at else "Pending"
        table_rows += f"""
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 12px; color: #38bdf8; font-weight: bold;">#{idx}</td>
          <td style="padding: 12px; color: #f1f5f9;">{comp.address}</td>
          <td style="padding: 12px; color: #94a3b8; white-space: nowrap;">{filed_str}</td>
          <td style="padding: 12px; text-align: right;"><span style="background-color: #7f1d1d; color: #fca5a5; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: bold; white-space: nowrap;">{comp.days_open} days</span></td>
          <td style="padding: 12px; color: #94a3b8; font-size: 13px;">{comp.description}</td>
        </tr>
        """

    html_report = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>CityPulse Escalation Report</title>
    </head>
    <body style="background-color: #030712; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px; line-height: 1.6;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);">
        
        <!-- Header -->
        <div style="border-bottom: 2px solid #ef4444; padding-bottom: 24px; margin-bottom: 32px;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <span style="background-color: #ef4444; color: white; text-transform: uppercase; font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: bold; letter-spacing: 1px;">High Priority Escalation</span>
              <h1 style="color: #ef4444; font-size: 28px; font-weight: 800; margin: 8px 0 4px 0;">CityPulse Incident Report</h1>
            </div>
            <div style="text-align: right; font-size: 13px; color: #6b7280; margin-top: 10px;">
              Date Issued: {report_date}
            </div>
          </div>
          <p style="color: #9ca3af; margin: 0; font-size: 15px;">Official response petition targeting Council District {council_district}</p>
        </div>

        <!-- Memo To -->
        <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tr>
              <td style="width: 15%; padding: 4px 0; color: #9ca3af; font-weight: bold;">TO:</td>
              <td style="padding: 4px 0; color: #f9fafb;">Honorable Council Member {council_member} (District {council_district})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #9ca3af; font-weight: bold;">EMAIL:</td>
              <td style="padding: 4px 0; color: #3b82f6;">{council_member_email}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #9ca3af; font-weight: bold;">SLA TARGET:</td>
              <td style="padding: 4px 0; color: #10b981;">{city_avg} Closed SLA Days (Standard Category Averaging)</td>
            </tr>
          </table>
        </div>

        <!-- Summary Statistics Block -> Bento -->
        <h2 style="font-size: 20px; color: #f3f4f6; border-bottom: 1px solid #1f2937; padding-bottom: 8px; margin-bottom: 16px;">Executive Briefing</h2>
        <div style="display: flex; gap: 16px; margin-bottom: 32px;">
          <div style="flex: 1; background-color: #111827; border: 1px solid #1f2937; padding: 18px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: 800; color: #ef4444;">{complaint_count}</div>
            <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">Active Complaints</div>
          </div>
          <div style="flex: 1; background-color: #111827; border: 1px solid #1f2937; padding: 18px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: 800; color: #f59e0b; text-transform: capitalize;">{category.replace('_', ' ')}</div>
            <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">Standard Topic</div>
          </div>
          <div style="flex: 1; background-color: #111827; border: 1px solid #1f2937; padding: 18px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: 800; color: #ef4444;">{max([c.days_open for c in complaints_list])}d</div>
            <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">Oldest Ticket Age</div>
          </div>
        </div>

        <p style="font-size: 15px; color: #d1d5db; margin-bottom: 24px;">
          Dear Honorable Council Member {council_member},<br><br>
          This automated briefing highlights a systemic concentration of unresolved 311 service tickets located in your district. Consistent with the CityPulse transparency guidelines, we have aggregated {complaint_count} active incidents matching <strong>{category}</strong>. These exceed standard district resolution benchmarks, indicating priority neighborhood attention is necessary on behalf of your constituents.
        </p>

        <!-- Complaints Listing Table -->
        <h2 style="font-size: 20px; color: #f3f4f6; border-bottom: 1px solid #1f2937; padding-bottom: 8px; margin-bottom: 16px;">Detailed Incidents Map</h2>
        <div style="overflow-x: auto; margin-bottom: 32px;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 2px solid #334155; background-color: #0f172a;">
                <th style="padding: 12px; color: #94a3b8; font-weight: 600;">#</th>
                <th style="padding: 12px; color: #94a3b8; font-weight: 600;">Constituent Address</th>
                <th style="padding: 12px; color: #94a3b8; font-weight: 600;">Filed Date</th>
                <th style="padding: 12px; color: #94a3b8; font-weight: 600; text-align: right;">Age (Days)</th>
                <th style="padding: 12px; color: #94a3b8; font-weight: 600; min-width: 250px;">Description Details</th>
              </tr>
            </thead>
            <tbody>
              {table_rows}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #1f2937; padding-top: 24px; margin-top: 40px; text-align: center; font-size: 12px; color: #4b5563;">
          <strong style="color: #9ca3af;">Generated by CityPulse</strong><br>
          An independent automated neighborhood civic accountability watchdog engine.
        </div>

      </div>
    </body>
    </html>
    """

    # Turn the physical document string into a base64 encoded URL
    encoded_html = base64.b64encode(html_report.encode("utf-8")).decode("utf-8")
    inline_data_url = f"data:text/html;base64,{encoded_html}"

    # 6. Save the escalation proposal to DB
    escalation_uuid = uuid.uuid4()
    insert_sql = """
        INSERT INTO escalations (id, cluster_id, council_member_name, council_member_email, report_url, sent_at, complaint_count)
        VALUES (:id, :cluster_id, :council_member_name, :council_member_email, :report_url, NOW(), :complaint_count)
    """
    insert_params = {
        "id": escalation_uuid,
        "cluster_id": cluster_uuid,
        "council_member_name": council_member,
        "council_member_email": council_member_email,
        "report_url": inline_data_url,
        "complaint_count": len(complaints_list)
    }

    try:
        await db.execute(text(insert_sql), insert_params)
        
        # 7. Update cluster escalated flag
        await db.execute(
            text("UPDATE clusters SET escalated = true WHERE id = :id"),
            {"id": cluster_uuid}
        )
        await db.commit()
    except Exception as db_ex:
        logger.exception(f"Failed registering cluster escalation trace: {db_ex}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed registering escalation record in datastore.")

    return {
        "escalation_id": str(escalation_uuid),
        "council_member": council_member,
        "council_member_email": council_member_email,
        "complaint_count": len(complaints_list),
        "report_html": html_report
    }


@router.get("/{cluster_id}")
async def get_escalation_by_cluster(
    cluster_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Checks if cluster has an existing saved escalation record, and returns its metadata detail.
    """
    logger.info(f"Looking up cluster escalation record for Cluster ID: {cluster_id}")

    try:
        cluster_uuid = uuid.UUID(cluster_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cluster_id UUID format.")

    select_sql = """
        SELECT id, cluster_id, council_member_name, council_member_email, report_url, sent_at, complaint_count
        FROM escalations
        WHERE cluster_id = :cluster_id
    """
    
    try:
        res = await db.execute(text(select_sql), {"cluster_id": cluster_uuid})
        row = res.fetchone()
    except Exception as db_ex:
        logger.exception(f"Database read failure while checking escalation status: {db_ex}")
        raise HTTPException(status_code=500, detail="Internal datastore query error.")

    if not row:
        raise HTTPException(status_code=404, detail="No escalation records exist matching this cluster ID.")

    return {
        "id": str(row.id),
        "cluster_id": str(row.cluster_id),
        "council_member_name": row.council_member_name,
        "council_member_email": row.council_member_email,
        "report_url": row.report_url,
        "sent_at": row.sent_at.isoformat() if row.sent_at else None,
        "complaint_count": row.complaint_count
    }

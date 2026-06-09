# FILE: backend/scripts/test_chicago_adapter.py
# ROLE: Standalone script to test the Chicago 311 Adapter by fetching and displaying recent complaints.

import asyncio
import os
import sys
from datetime import datetime, timedelta

# Adjust Python path to support multiple running styles
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

try:
    from app.services.city_adapters.chicago import ChicagoAdapter
except ImportError:
    try:
        from backend.app.services.city_adapters.chicago import ChicagoAdapter
    except ImportError:
        # Fallback to absolute workspace root if needed
        workspace_root = os.path.dirname(parent_dir)
        sys.path.append(workspace_root)
        from backend.app.services.city_adapters.chicago import ChicagoAdapter

async def main():
    print("Initializing Chicago 311 Adapter...")
    adapter = ChicagoAdapter()
    
    # 3 days ago for reliable window on lagging APIs
    since = datetime.utcnow() - timedelta(days=3)
    limit = 10
    
    print(f"Fetching up to {limit} complaints since {since} UTC...")
    
    try:
        complaints = await adapter.fetch_recent_complaints(since=since, limit=limit)
    except Exception as e:
        print(f"Error calling fetch_recent_complaints: {e}")
        sys.exit(1)
        
    print("\n" + "="*80)
    # Formatted table headers
    print(f"{'CATEGORY':<15} | {'ADDRESS':<35} | {'FILED AT':<20} | {'STATUS':<8}")
    print("-"*80)
    
    for comp in complaints:
        category = comp.category or "N/A"
        address = comp.address or "Unknown Address"
        # Truncate address if too long
        if len(address) > 33:
            address = address[:30] + "..."
            
        filed_at_str = comp.filed_at.strftime("%Y-%m-%d %H:%M:%S") if comp.filed_at else "N/A"
        status = comp.status or "N/A"
        
        print(f"{category:<15} | {address:<35} | {filed_at_str:<20} | {status:<8}")
        
    print("="*80)
    print(f"Fetched {len(complaints)} complaints from Chicago successfully")

if __name__ == "__main__":
    asyncio.run(main())

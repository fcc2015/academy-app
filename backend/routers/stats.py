from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from services.supabase_client import supabase

import logging
logger = logging.getLogger("stats")

router = APIRouter(prefix="/stats", tags=["Statistics"], dependencies=[Depends(verify_token)])

@router.get("/dashboard")
async def get_dashboard_metrics():
    try:
        stats = await supabase.get_dashboard_stats()
        activities = await supabase.get_recent_activity()
        return {
            "metrics": [
                {
                    "title": "Total Players",
                    "value": stats["total_players"],
                    "change": "+4%",
                    "isPositive": True,
                    "icon": "Users",
                    "color": "blue"
                },
                {
                    "title": "Academy Revenue",
                    "value": f"{stats['total_revenue']} MAD",
                    "change": "+12%",
                    "isPositive": True,
                    "icon": "DollarSign",
                    "color": "emerald"
                },
                {
                    "title": "Active Coaches",
                    "value": stats["active_coaches"],
                    "trend": "Stable",
                    "icon": "Shield",
                    "color": "indigo"
                },
                {
                    "title": "Upcoming Events",
                    "value": stats["upcoming_events"],
                    "trend": "Active",
                    "icon": "Calendar",
                    "color": "purple"
                }
            ],
            "activities": activities
        }
    except Exception as e:
        logger.error("Error fetching dashboard stats: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

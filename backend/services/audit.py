"""
Audit logging service — tracks all important actions.
Call log_action() from routers after CRUD operations.
"""
import logging
from services.supabase_client import supabase
from datetime import datetime, timezone

logger = logging.getLogger("audit")


async def log_action(
    user_id: str,
    action: str,
    entity: str,
    entity_id: str = None,
    details: dict = None
):
    """
    Log an action to the audit_logs table.
    
    Args:
        user_id: ID of the user performing the action
        action: 'create', 'update', 'delete', 'login', 'export', etc.
        entity: 'player', 'coach', 'payment', 'event', etc.
        entity_id: ID of the affected entity
        details: Additional context (JSON)
    """
    try:
        log_entry = {
            "user_id": user_id,
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
            "details": details or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        # Use Supabase REST API directly
        await supabase._post("/rest/v1/audit_logs", log_entry)
    except Exception as e:
        # Audit logging should never break the main flow
        logger.warning("Failed to log audit: %s on %s — %s", action, entity, e)

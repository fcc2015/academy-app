from fastapi import APIRouter, HTTPException, status
from services.supabase_client import supabase
from schemas.plans import SubscriptionPlanCreate, SubscriptionPlanUpdate

router = APIRouter(prefix="/plans", tags=["Subscription Plans"])


@router.get("/")
async def get_all_plans():
    try:
        data = await supabase.get_plans()
        return data
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/public")
async def get_public_plans():
    """Returns active plans only — used by the Landing Page"""
    try:
        data = await supabase.get_plans(active_only=True)
        return data
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/")
async def create_plan(plan: SubscriptionPlanCreate):
    try:
        # Remove None values to avoid overriding DB defaults
        payload = {k: v for k, v in plan.model_dump().items() if v is not None}
        data = await supabase.insert_plan(payload)
        return data
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/{plan_id}")
async def update_plan(plan_id: str, plan: SubscriptionPlanUpdate):
    try:
        data = await supabase.update_plan(plan_id, plan.model_dump(exclude_none=True))
        return data
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{plan_id}")
async def delete_plan(plan_id: str):
    try:
        await supabase.delete_plan(plan_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

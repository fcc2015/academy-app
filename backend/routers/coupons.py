from fastapi import APIRouter, Depends, HTTPException, status, Query
from core.auth_middleware import verify_token
from typing import List
from schemas.coupons import CouponCreate, CouponResponse
from services.supabase_client import supabase

router = APIRouter(prefix="/coupons", tags=["Coupons"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[CouponResponse])
async def get_all_coupons():
    try:
        response = await supabase.get_coupons()
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching coupons: {str(e)}"
        )

@router.post("/", response_model=CouponResponse)
async def create_coupon(coupon: CouponCreate):
    try:
        response = await supabase.insert_coupon(coupon.model_dump())
        return response[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating coupon: {str(e)}"
        )

@router.get("/validate/{code}", response_model=CouponResponse)
async def validate_coupon(code: str):
    try:
        response = await supabase.get_coupon_by_code(code)
        if not response or not response.get('is_active'):
            raise HTTPException(status_code=404, detail="Invalid or inactive coupon code")
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error validating coupon: {str(e)}"
        )

@router.patch("/{coupon_id}/toggle", response_model=CouponResponse)
async def toggle_coupon(coupon_id: str, is_active: bool = Query(...)):
    try:
        response = await supabase.update_coupon_status(coupon_id, is_active)
        return response[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating coupon: {str(e)}"
        )

@router.delete("/{coupon_id}")
async def delete_coupon(coupon_id: str):
    try:
        await supabase.delete_coupon(coupon_id)
        return {"success": True, "message": "Coupon deleted."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting coupon: {str(e)}"
        )

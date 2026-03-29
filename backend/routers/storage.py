"""
Storage router for file uploads via Supabase Storage API.
Handles profile pictures and document uploads.
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from core.auth_middleware import verify_token
from services.supabase_client import supabase
import uuid
import base64

router = APIRouter(prefix="/storage", tags=["Storage"], dependencies=[Depends(verify_token)])

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "application/msword",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_DOC_SIZE = 10 * 1024 * 1024   # 10 MB


@router.post("/upload/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    entity_type: str = Query(..., description="player, coach, or admin"),
    entity_id: str = Query(..., description="ID of the entity")
):
    """Upload a profile image for a player, coach, or admin."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé. Utilisez JPEG, PNG, WebP ou GIF.")

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 5 MB.")

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_path = f"profiles/{entity_type}/{entity_id}.{ext}"

    try:
        url = await supabase.upload_file("avatars", file_path, content, file.content_type)
        return {"url": url, "path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur upload: {str(e)}")


@router.post("/upload/document")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Query("medical", description="medical, certificate, etc."),
    entity_id: str = Query(..., description="Player or entity ID")
):
    """Upload a document (medical, certificate, etc.)."""
    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé.")

    content = await file.read()
    if len(content) > MAX_DOC_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 10 MB.")

    ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    unique = uuid.uuid4().hex[:8]
    file_path = f"documents/{category}/{entity_id}/{unique}.{ext}"

    try:
        url = await supabase.upload_file("documents", file_path, content, file.content_type)
        return {"url": url, "path": file_path, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur upload: {str(e)}")


@router.delete("/delete")
async def delete_file(
    bucket: str = Query(...),
    path: str = Query(...)
):
    """Delete a file from storage."""
    try:
        await supabase.delete_file(bucket, path)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur suppression: {str(e)}")

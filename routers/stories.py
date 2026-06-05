from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token, require_role
from core.context import academy_id_ctx, user_id_ctx, role_ctx
from typing import List
from schemas.stories import StoryCreate, StoryResponse
from services.supabase_client import supabase
import logging

logger = logging.getLogger("stories")

router = APIRouter(prefix="/stories", tags=["Stories"], dependencies=[Depends(verify_token)])


@router.get("/", response_model=List[StoryResponse])
async def get_active_stories():
    """Get active (non-expired) stories for the current academy."""
    try:
        data = await supabase.get_stories()
        return data
    except Exception as e:
        logger.error("Error fetching stories: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


@router.post("/", response_model=StoryResponse)
async def create_story(
    story: StoryCreate,
    user: dict = Depends(require_role("admin", "super_admin", "coach", "sous_admin"))
):
    """Create a new story (visible for 24 hours)."""
    try:
        story_dict = story.model_dump(exclude_unset=True)
        result = await supabase.insert_story(story_dict)
        if isinstance(result, list):
            return result[0]
        return result
    except Exception as e:
        logger.error("Error creating story: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


@router.delete("/{story_id}")
async def delete_story(
    story_id: str,
    user: dict = Depends(require_role("admin", "super_admin", "coach", "sous_admin"))
):
    """Delete a story by ID."""
    try:
        uid = user_id_ctx.get(None)
        role = role_ctx.get(None)
        # Verify ownership (coaches can only delete their own stories)
        if role not in ("admin", "super_admin", "sous_admin"):
            story = await supabase.get_story_by_id(story_id)
            if not story or story.get("user_id") != uid:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only delete your own stories."
                )
        return await supabase.delete_story(story_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting story: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

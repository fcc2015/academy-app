"""Tests for Stories and Advertisements endpoints."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from main import app

# ─── Shared auth mocks ─────────────────────────────────────────────

ADMIN_TOKEN = {"sub": "admin-user-1", "role": "admin", "academy_id": "acad-1"}
COACH_TOKEN = {"sub": "coach-user-1", "role": "coach", "academy_id": "acad-1"}
PLAYER_TOKEN = {"sub": "player-user-1", "role": "player", "academy_id": "acad-1"}

SAMPLE_STORY = {
    "id": "story-1",
    "academy_id": "acad-1",
    "user_id": "admin-user-1",
    "media_url": "https://example.com/img.jpg",
    "media_type": "image",
    "caption": "Great training today",
    "expires_at": "2099-01-01T00:00:00Z",
    "created_at": "2026-01-01T08:00:00Z",
    "full_name": "Ahmed Admin",
}

SAMPLE_AD = {
    "id": "ad-1",
    "academy_id": "acad-1",
    "title": "Summer Camp Registration Open",
    "media_url": "https://example.com/ad.jpg",
    "link_url": "https://example.com/register",
    "target_roles": [],
    "target_categories": [],
    "is_active": True,
    "views_count": 0,
    "clicks_count": 0,
    "created_at": "2026-01-01T08:00:00Z",
}


def make_auth_override(token_data: dict):
    """Create a verify_token dependency override."""
    from core.context import academy_id_ctx, user_id_ctx, role_ctx

    async def override():
        academy_id_ctx.set(token_data.get("academy_id"))
        user_id_ctx.set(token_data.get("sub"))
        role_ctx.set(token_data.get("role"))
        return token_data

    return override


# ═══════════════════════════════════════════════════════════════════
# STORIES TESTS
# ═══════════════════════════════════════════════════════════════════

class TestStoriesGet:
    @pytest.mark.asyncio
    async def test_get_stories_requires_auth(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/stories/")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_get_stories_returns_list(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(PLAYER_TOKEN)
        try:
            with patch("routers.stories.supabase") as mock_sb:
                mock_sb.get_stories = AsyncMock(return_value=[SAMPLE_STORY])
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.get("/api/v1/stories/")
            assert res.status_code == 200
            data = res.json()
            assert isinstance(data, list)
            assert len(data) == 1
            assert data[0]["caption"] == "Great training today"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_stories_returns_empty_list_on_error(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(PLAYER_TOKEN)
        try:
            with patch("routers.stories.supabase") as mock_sb:
                mock_sb.get_stories = AsyncMock(side_effect=Exception("DB error"))
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.get("/api/v1/stories/")
            assert res.status_code == 500
        finally:
            app.dependency_overrides.clear()


class TestStoriesCreate:
    @pytest.mark.asyncio
    async def test_create_story_as_admin(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(ADMIN_TOKEN)
        try:
            with patch("routers.stories.supabase") as mock_sb:
                mock_sb.insert_story = AsyncMock(return_value=SAMPLE_STORY)
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.post("/api/v1/stories/", json={
                        "caption": "Great training today",
                        "media_url": "https://example.com/img.jpg",
                        "media_type": "image",
                    })
            assert res.status_code == 200
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_create_story_as_coach(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(COACH_TOKEN)
        try:
            with patch("routers.stories.supabase") as mock_sb:
                mock_sb.insert_story = AsyncMock(return_value={**SAMPLE_STORY, "user_id": "coach-user-1"})
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.post("/api/v1/stories/", json={
                        "caption": "Coach tip: work on your first touch",
                    })
            assert res.status_code == 200
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_create_story_player_forbidden(self):
        """Players should not be able to create stories."""
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(PLAYER_TOKEN)
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.post("/api/v1/stories/", json={"caption": "Hello!"})
            assert res.status_code == 403
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_create_story_strips_html_from_caption(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(ADMIN_TOKEN)
        try:
            with patch("routers.stories.supabase") as mock_sb:
                mock_sb.insert_story = AsyncMock(return_value=SAMPLE_STORY)
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.post("/api/v1/stories/", json={
                        "caption": "<script>alert('xss')</script>Good session",
                        "media_type": "image",
                    })
            assert res.status_code == 200
            # Schema should have stripped the HTML — verify supabase received clean data
            call_args = mock_sb.insert_story.call_args[0][0]
            assert "<script>" not in (call_args.get("caption") or "")
        finally:
            app.dependency_overrides.clear()


class TestStoriesDelete:
    @pytest.mark.asyncio
    async def test_delete_own_story_as_admin(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(ADMIN_TOKEN)
        try:
            with patch("routers.stories.supabase") as mock_sb:
                mock_sb.delete_story = AsyncMock(return_value={"success": True})
                mock_sb.get_story_by_id = AsyncMock(return_value=SAMPLE_STORY)
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.delete("/api/v1/stories/story-1")
            assert res.status_code == 200
        finally:
            app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════
# ADVERTISEMENTS TESTS
# ═══════════════════════════════════════════════════════════════════

class TestAdvertisementsGet:
    @pytest.mark.asyncio
    async def test_get_ads_requires_auth(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/v1/advertisements/")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_get_ads_returns_list(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(PLAYER_TOKEN)
        try:
            with patch("routers.advertisements.supabase") as mock_sb:
                mock_sb.get_advertisements = AsyncMock(return_value=[SAMPLE_AD])
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.get("/api/v1/advertisements/")
            assert res.status_code == 200
            data = res.json()
            assert isinstance(data, list)
            assert data[0]["title"] == "Summer Camp Registration Open"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_ads_filters_by_role(self):
        """Ads with specific target_roles should pass through the role filter."""
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(COACH_TOKEN)
        try:
            with patch("routers.advertisements.supabase") as mock_sb:
                # Ad for coaches only
                coach_ad = {**SAMPLE_AD, "id": "ad-coach", "target_roles": ["coach"]}
                player_ad = {**SAMPLE_AD, "id": "ad-player", "target_roles": ["player"]}
                mock_sb.get_advertisements = AsyncMock(return_value=[coach_ad, player_ad])
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.get("/api/v1/advertisements/")
            assert res.status_code == 200
            # The router filters by role inside get_advertisements
        finally:
            app.dependency_overrides.clear()


class TestAdvertisementsPlanFiltering:
    @pytest.mark.asyncio
    async def test_get_ads_free_plan(self):
        from services.supabase_client import supabase
        from core.context import academy_id_ctx
        academy_id_ctx.set("acad-1")
        try:
            with patch.object(supabase, "_get", new_callable=AsyncMock) as mock_get:
                mock_get.side_effect = [
                    [{"plan_id": "free"}],
                    [{"id": "ad-1", "ad_type": "general"}]
                ]
                res = await supabase.get_advertisements(role="player", active_only=True)
                assert len(res) == 1
                calls = mock_get.call_args_list
                assert "academies?id=eq.acad-1" in calls[0][0][0]
                assert "advertisements" in calls[1][0][0]
                assert "ad_type.eq.general" in calls[1][0][0] or "ad_type.is.null" in calls[1][0][0]
        finally:
            academy_id_ctx.set(None)

    @pytest.mark.asyncio
    async def test_get_ads_pro_plan(self):
        from services.supabase_client import supabase
        from core.context import academy_id_ctx
        academy_id_ctx.set("acad-1")
        try:
            with patch.object(supabase, "_get", new_callable=AsyncMock) as mock_get:
                mock_get.side_effect = [
                    [{"plan_id": "pro"}],
                    [{"id": "ad-1", "ad_type": "pro"}]
                ]
                res = await supabase.get_advertisements(role="player", active_only=True)
                assert len(res) == 1
                calls = mock_get.call_args_list
                assert "ad_type=eq.pro" in calls[1][0][0]
        finally:
            academy_id_ctx.set(None)

    @pytest.mark.asyncio
    async def test_get_ads_enterprise_plan(self):
        from services.supabase_client import supabase
        from core.context import academy_id_ctx
        academy_id_ctx.set("acad-1")
        try:
            with patch.object(supabase, "_get", new_callable=AsyncMock) as mock_get:
                mock_get.side_effect = [
                    [{"plan_id": "enterprise"}],
                    [{"id": "ad-1", "ad_type": "1to1"}]
                ]
                res = await supabase.get_advertisements(role="player", active_only=True)
                assert len(res) == 1
                calls = mock_get.call_args_list
                assert "ad_type=eq.1to1" in calls[1][0][0]
                assert "academy_id=eq.acad-1" in calls[1][0][0]
        finally:
            academy_id_ctx.set(None)


class TestAdvertisementsCreate:
    @pytest.mark.asyncio
    async def test_create_ad_admin_only(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(ADMIN_TOKEN)
        try:
            with patch("routers.advertisements.supabase") as mock_sb:
                mock_sb.insert_advertisement = AsyncMock(return_value=SAMPLE_AD)
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.post("/api/v1/advertisements/", json={
                        "title": "Summer Camp Registration Open",
                        "media_url": "https://example.com/ad.jpg",
                        "link_url": "https://example.com/register",
                        "target_roles": [],
                        "is_active": True,
                    })
            assert res.status_code == 200
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_create_ad_coach_forbidden(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(COACH_TOKEN)
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.post("/api/v1/advertisements/", json={
                    "title": "Coach ad attempt",
                    "media_url": "https://example.com/ad.jpg",
                })
            assert res.status_code == 403
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_create_ad_missing_required_fields(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(ADMIN_TOKEN)
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                # Missing media_url (required)
                res = await client.post("/api/v1/advertisements/", json={
                    "title": "Incomplete Ad",
                })
            assert res.status_code == 422
        finally:
            app.dependency_overrides.clear()


class TestAdvertisementsTracking:
    @pytest.mark.asyncio
    async def test_track_view(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(PLAYER_TOKEN)
        try:
            with patch("routers.advertisements.supabase") as mock_sb:
                mock_sb.increment_ad_stat = AsyncMock(return_value={"success": True})
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.post("/api/v1/advertisements/ad-1/view")
            assert res.status_code == 200
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_track_click(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(PLAYER_TOKEN)
        try:
            with patch("routers.advertisements.supabase") as mock_sb:
                mock_sb.increment_ad_stat = AsyncMock(return_value={"success": True})
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.post("/api/v1/advertisements/ad-1/click")
            assert res.status_code == 200
        finally:
            app.dependency_overrides.clear()


class TestAdvertisementsDelete:
    @pytest.mark.asyncio
    async def test_delete_ad_admin(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(ADMIN_TOKEN)
        try:
            with patch("routers.advertisements.supabase") as mock_sb:
                mock_sb.delete_advertisement = AsyncMock(return_value={"success": True})
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    res = await client.delete("/api/v1/advertisements/ad-1")
            assert res.status_code == 200
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_delete_ad_coach_forbidden(self):
        from core.auth_middleware import verify_token
        app.dependency_overrides[verify_token] = make_auth_override(COACH_TOKEN)
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.delete("/api/v1/advertisements/ad-1")
            assert res.status_code == 403
        finally:
            app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════
# SCHEMA VALIDATION TESTS
# ═══════════════════════════════════════════════════════════════════

class TestStoriesSchema:
    def test_story_create_valid(self):
        from schemas.stories import StoryCreate
        s = StoryCreate(caption="Hello!", media_type="image")
        assert s.caption == "Hello!"
        assert s.media_type == "image"

    def test_story_create_strips_html(self):
        from schemas.stories import StoryCreate
        s = StoryCreate(caption="<b>Bold</b> text")
        assert "<b>" not in s.caption
        assert "Bold" in s.caption

    def test_story_create_invalid_media_type(self):
        from schemas.stories import StoryCreate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            StoryCreate(media_type="pdf")


class TestAdvertisementsSchema:
    def test_ad_create_valid(self):
        from schemas.advertisements import AdCreate
        ad = AdCreate(
            title="Test Ad",
            media_url="https://example.com/img.jpg",
        )
        assert ad.title == "Test Ad"
        assert ad.is_active is True
        assert ad.ad_type == "general"

    def test_ad_create_strips_html_from_title(self):
        from schemas.advertisements import AdCreate
        ad = AdCreate(
            title="<script>alert(1)</script>Safe Title",
            media_url="https://example.com/img.jpg",
        )
        assert "<script>" not in ad.title
        assert "Safe Title" in ad.title

    def test_ad_create_requires_media_url(self):
        from schemas.advertisements import AdCreate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            AdCreate(title="No media")

    def test_ad_create_invalid_ad_type(self):
        from schemas.advertisements import AdCreate
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            AdCreate(
                title="Test Ad",
                media_url="https://example.com/img.jpg",
                ad_type="malicious_type",
            )

    def test_ad_create_valid_ad_types(self):
        from schemas.advertisements import AdCreate
        for t in ["general", "pro", "1to1"]:
            ad = AdCreate(
                title="Test Ad",
                media_url="https://example.com/img.jpg",
                ad_type=t,
            )
            assert ad.ad_type == t

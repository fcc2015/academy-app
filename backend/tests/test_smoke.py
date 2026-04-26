"""Smoke tests — make sure the app boots and basic endpoints respond."""


def test_root_returns_welcome(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "message" in res.json()


def test_health_endpoint_returns_status(client, respx_mock):
    """Health endpoint pings Supabase — mock it so the test doesn't hit real network."""
    import respx
    from httpx import Response
    respx_mock.get("https://test-project.supabase.co/rest/v1/").mock(
        return_value=Response(200, json={})
    )
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"


def test_health_when_db_down(client, respx_mock):
    from httpx import Response
    respx_mock.get("https://test-project.supabase.co/rest/v1/").mock(
        return_value=Response(503, json={})
    )
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["database"] == "unreachable"


def test_security_headers_present(client):
    res = client.get("/")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "Content-Security-Policy" in res.headers


def test_request_id_header_returned(client):
    res = client.get("/")
    assert "X-Request-ID" in res.headers
    assert len(res.headers["X-Request-ID"]) >= 8


def test_request_id_passthrough(client):
    """Custom X-Request-ID from client should be preserved."""
    custom_id = "trace-abc-123"
    res = client.get("/", headers={"X-Request-ID": custom_id})
    assert res.headers["X-Request-ID"] == custom_id

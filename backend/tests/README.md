# Backend Tests

## Running tests locally

From `backend/` with the venv activated (or via the venv's Python directly):

```bash
# All tests
./venv/Scripts/python.exe -m pytest tests/

# With coverage
./venv/Scripts/python.exe -m pytest tests/ --cov=routers --cov=services --cov=core --cov-report=term-missing

# A single file
./venv/Scripts/python.exe -m pytest tests/test_auth.py -v

# A single test
./venv/Scripts/python.exe -m pytest tests/test_auth.py::test_login_success_sets_cookies -v

# Only security-tagged tests
./venv/Scripts/python.exe -m pytest tests/ -m security

# Stop at first failure
./venv/Scripts/python.exe -m pytest tests/ -x
```

On Linux/macOS, swap `./venv/Scripts/python.exe` for `./venv/bin/python`.

## Layout

| File | Scope |
|------|-------|
| `conftest.py` | Shared fixtures: `client`, `admin_client`, `parent_client`, `coach_client`, `super_admin_client`, `authed_as` factory, `reset_state` |
| `test_smoke.py` | Boot, health endpoint, security headers, request ID |
| `test_auth.py` | Login, register, OTP, 2FA, rate limiting |
| `test_parent_isolation.py` | Security: parents can't see other families' data |
| `test_billing_engine.py` | Pure logic: prorata, due dates, alert thresholds, invoice numbering |
| `test_payments_gateway.py` | PayPal order create/capture, webhook signature security |
| `test_coupons.py` | Coupon CRUD, validation, inactive-coupon revenue-leak prevention |

## Markers

```python
@pytest.mark.unit          # default — fast, mocked
@pytest.mark.security      # authorization / isolation rules
@pytest.mark.integration   # requires a live Supabase test project (none yet)
@pytest.mark.slow          # > 1 second
```

Run a marker subset with `pytest -m "<marker>"`.

## How mocking works

Two strategies are used together:

1. **`mocker.patch("services.supabase_client.supabase.<method>", side_effect=...)`** — for high-level Supabase methods like `sign_in_with_password`, `get_players`, `insert_coupon`. Use this when the route calls `supabase.something()`.

2. **`respx_mock`** — intercepts raw `httpx.AsyncClient` calls. Use this when the route directly creates an `httpx.AsyncClient(...)` (the auth router and parts of `payments_gateway` do this).

Auth-required routes use FastAPI dependency overrides via the `admin_client` / `parent_client` fixtures, bypassing real Supabase token verification.

## Adding a new test file

1. Create `tests/test_<name>.py`
2. Use existing fixtures from `conftest.py` — don't duplicate setup
3. Mock external calls (Supabase, PayPal) — never hit real services from unit tests
4. Reset state via the `reset_state` fixture (autoloaded by all `*_client` fixtures)
5. Run locally before pushing — CI will fail on a single broken test

## CI

Tests run automatically on every push to `main` and every PR via `.github/workflows/backend-tests.yml`. Coverage report is attached as an artifact.

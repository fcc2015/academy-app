# Academy SaaS

[![Backend Tests](https://github.com/fcc2015/academy-app/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/fcc2015/academy-app/actions/workflows/backend-tests.yml)
[![Frontend Checks](https://github.com/fcc2015/academy-app/actions/workflows/frontend-checks.yml/badge.svg)](https://github.com/fcc2015/academy-app/actions/workflows/frontend-checks.yml)

Multi-tenant football academy management platform.

**Stack:** React 19 + Vite frontend, FastAPI backend, Supabase (auth/DB/storage), PayPal, Capacitor for mobile.

## Quick start

### Backend
```bash
cd backend
python -m venv venv
./venv/Scripts/activate          # Windows
# source venv/bin/activate       # Linux/macOS
pip install -r requirements.txt  # or requirements-dev.txt for testing
uvicorn main:app --reload
```

### Frontend
```bash
npm install
npm run dev
```

### Mobile (Android)
```bash
npm run build:android
npm run open:android
```

## Tests

See [backend/tests/README.md](backend/tests/README.md) for the testing guide.

```bash
cd backend
./venv/Scripts/python.exe -m pytest tests/ --cov=routers --cov=services --cov=core
```

## Roadmap

See [ROADMAP.md](ROADMAP.md).

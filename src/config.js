// In production: use relative path — Vercel proxies /api/* to the backend,
// making cookies first-party (avoids third-party cookie blocking).
// In local dev: VITE_API_URL points to http://localhost:8000.
const _BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const API_URL = `${_BASE}/api/v1`;

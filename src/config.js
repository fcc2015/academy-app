const _BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
export const API_URL = `${_BASE}/api/v1`;

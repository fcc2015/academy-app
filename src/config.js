const rawUrl = import.meta.env.VITE_API_URL || 'https://elghazali1987-academy-backend.hf.space';
const _BASE = rawUrl.replace(/\/$/, '');
export const API_URL = _BASE.endsWith('/api/v1') ? _BASE : `${_BASE}/api/v1`;

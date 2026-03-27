import { API_URL } from './config';

/**
 * Authenticated fetch wrapper.
 * Automatically attaches JWT token from localStorage to every request.
 * Falls back to normal fetch if no token is stored (public endpoints).
 */
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Auto-add Content-Type for JSON bodies if not already set
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(url, { ...options, headers });
}

/**
 * Check if the current session is valid.
 * Returns true if token exists and hasn't expired.
 */
export function isAuthenticated() {
  const token = localStorage.getItem('token');
  const expires = parseInt(localStorage.getItem('token_expires') || '0');
  return token && (expires === 0 || Date.now() < expires);
}

/**
 * Clear all auth data and redirect to login.
 */
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user_id');
  localStorage.removeItem('token_expires');
  window.location.href = '/login';
}

// Legacy export
export async function sendMessage(message) {
  const res = await authFetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message })
  });
  const data = await res.json();
  return data.reply;
}
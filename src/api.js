import { API_URL } from './config';

/**
 * Authenticated fetch wrapper with retry logic and network error handling.
 * - Attaches JWT token from localStorage
 * - Retries on 502/503/504 and network errors (up to 2 retries)
 * - Handles 401 by redirecting to login
 * - Throws user-friendly errors for timeout/network failures
 */

const MAX_RETRIES = 2;
const RETRY_DELAY = 800; // ms, doubles each retry
const FETCH_TIMEOUT = 30000; // 30s

/**
 * Fetch with timeout support.
 */
function fetchWithTimeout(url, options, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

export async function authFetch(url, options = {}) {
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

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { ...options, headers });

      // Auto-logout on 401 (expired/invalid token)
      if (res.status === 401) {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && currentPath !== '/') {
          logout();
        }
        return res;
      }

      // Retry on transient server errors
      if ([502, 503, 504].includes(res.status) && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * (2 ** attempt)));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;

      // Network error or timeout — retry if not last attempt
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * (2 ** attempt)));
        continue;
      }

      // Final attempt failed — throw user-friendly error
      if (err.name === 'AbortError') {
        throw new NetworkError('Request timed out. Please check your connection and try again.');
      }
      if (!navigator.onLine) {
        throw new NetworkError('You are offline. Please check your internet connection.');
      }
      throw new NetworkError('Unable to connect to the server. Please try again later.');
    }
  }

  throw lastError;
}

/**
 * Custom error class for network-related failures.
 * Components can check `instanceof NetworkError` to show appropriate UI.
 */
export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
    this.isNetwork = true;
  }
}

/**
 * Check if the current session is valid.
 * Returns true if token exists and hasn't expired.
 */
export function isAuthenticated() {
  const token = localStorage.getItem('token');
  const expires = parseInt(localStorage.getItem('token_expires') || '0');
  if (!token) return false;
  if (expires > 0 && Date.now() >= expires) {
    // Token expired — clean up
    logout();
    return false;
  }
  return true;
}

/**
 * Clear all auth data and redirect to login.
 */
export function logout() {
  const role = localStorage.getItem('role');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user_id');
  localStorage.removeItem('token_expires');
  // Redirect to appropriate login based on previous role
  if (role === 'super_admin') {
    window.location.href = '/saas/login';
  } else {
    window.location.href = '/login';
  }
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
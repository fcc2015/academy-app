import { API_URL } from './config';

/**
 * Authenticated fetch wrapper with retry logic and network error handling.
 * - Sends JWT via Authorization header (cross-domain safe)
 * - Also sends cookies as fallback via credentials: 'include'
 * - Retries on 502/503/504 and network errors (up to 2 retries)
 * - Handles 401 by attempting token refresh, then redirecting to login
 * - Throws user-friendly errors for timeout/network failures
 */

const MAX_RETRIES = 2;
const RETRY_DELAY = 800; // ms, doubles each retry
const FETCH_TIMEOUT = 30000; // 30s

// ─── Refresh Token Logic ──────────────────────────────────────
// Prevents parallel refresh storms: queue concurrent 401s and resolve them
// after a single refresh call completes.
let _isRefreshing = false;
let _refreshQueue = [];

async function tryRefreshToken() {
  if (_isRefreshing) {
    return new Promise((resolve) => {
      _refreshQueue.push(resolve);
    });
  }

  _isRefreshing = true;
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      _refreshQueue.forEach(resolve => resolve(false));
      return false;
    }

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      // Store new tokens from response body
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
      }
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      _refreshQueue.forEach(resolve => resolve(true));
      return true;
    }

    _refreshQueue.forEach(resolve => resolve(false));
    return false;
  } catch {
    _refreshQueue.forEach(resolve => resolve(false));
    return false;
  } finally {
    _isRefreshing = false;
    _refreshQueue = [];
  }
}

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
  const headers = {
    ...(options.headers || {}),
  };

  // Auto-add Content-Type for JSON bodies if not already set
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Add Bearer token from localStorage (cross-domain safe — not blocked like cookies)
  const token = localStorage.getItem('token');
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        ...options,
        headers,
        credentials: 'include', // Also send cookies as fallback
      });

      // On 401: try refresh first, retry once, then logout
      if (res.status === 401) {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && currentPath !== '/') {
          const refreshed = await tryRefreshToken();
          if (refreshed) {
            // Update the Authorization header with the new token
            const newToken = localStorage.getItem('token');
            if (newToken) {
              headers['Authorization'] = `Bearer ${newToken}`;
            }
            // Retry the original request with fresh token
            return fetchWithTimeout(url, { ...options, headers, credentials: 'include' });
          }
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
 * Checks for both role and token presence.
 */
export function isAuthenticated() {
  return !!localStorage.getItem('role') && !!localStorage.getItem('token');
}

/**
 * Clear all auth data and redirect to login.
 * Calls backend to clear cookies (fire-and-forget), then clears localStorage.
 */
export function logout() {
  const role = localStorage.getItem('role');

  // Clear server-side cookies (fire-and-forget)
  fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});

  // Clear client-side storage
  localStorage.removeItem('role');
  localStorage.removeItem('user_id');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  // Legacy cleanup
  localStorage.removeItem('token_expires');

  // Redirect to appropriate login
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

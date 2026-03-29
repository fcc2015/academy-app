import { API_URL } from './config';

/**
 * Authenticated fetch wrapper.
 * Automatically attaches JWT token from localStorage to every request.
 * Handles 401 responses by redirecting to login.
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

  return fetch(url, { ...options, headers }).then(res => {
    // Auto-logout on 401 (expired/invalid token)
    if (res.status === 401) {
      const currentPath = window.location.pathname;
      // Don't redirect if already on login page or on a public route
      if (!currentPath.includes('/login') && currentPath !== '/') {
        logout();
      }
    }
    return res;
  });
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
import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch, NetworkError } from '../api';
import { API_URL } from '../config';

/**
 * useApi — Standardized data fetching hook with loading, error, and retry.
 *
 * Features:
 *   - Automatic loading state management
 *   - Network error detection with user-friendly messages
 *   - Built-in retry function
 *   - Null-safe data (always returns fallback if fetch fails)
 *   - Prevents state updates on unmounted components
 *
 * Usage:
 *   const { data, isLoading, error, retry } = useApi('/players/', []);
 *   // data is always an array (fallback), isLoading is a boolean,
 *   // error is a string or null, retry() re-fetches.
 *
 * @param {string} endpoint - API endpoint (relative to API_URL)
 * @param {any} fallback - Default value if fetch fails (e.g., [] or {})
 * @param {object} options - { skip, deps, transform }
 */
export function useApi(endpoint, fallback = null, options = {}) {
  const {
    skip = false,         // Skip fetching (e.g., conditional)
    deps = [],            // Extra dependencies to trigger re-fetch
    transform = null,     // Optional (data) => transformedData
    method = 'GET',       // HTTP method
    body = null,          // Request body for POST/PATCH
  } = options;

  const [data, setData] = useState(fallback);
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    if (skip) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchOptions = { method };
      if (body) {
        fetchOptions.body = JSON.stringify(body);
        fetchOptions.headers = { 'Content-Type': 'application/json' };
      }
      const res = await authFetch(`${API_URL}${endpoint}`, fetchOptions);
      if (!mountedRef.current) return;

      if (!res.ok) {
        // Try to extract error message from response
        let errMsg = `Server error (${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch {}
        setError(errMsg);
        setData(fallback);
        return;
      }

      let result = await res.json().catch(() => fallback);
      if (transform) {
        result = transform(result);
      }
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof NetworkError || err.isNetwork) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setData(fallback);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, skip, ...deps]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, retry: fetchData };
}

/**
 * NetworkErrorCard — Inline error display for API failures.
 * Drop-in replacement for showing error state in any section.
 */
export function NetworkErrorCard({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="bg-white rounded-[2rem] border border-red-100 p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <p className="text-sm font-bold text-slate-600 mb-4">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Retry
        </button>
      )}
    </div>
  );
}

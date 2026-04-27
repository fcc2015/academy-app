/**
 * Tests for src/hooks/useApi.js — the standardized data fetching hook.
 *
 * Covers:
 * - Loading state lifecycle
 * - Successful fetch sets data
 * - HTTP error → falls back, sets error message
 * - Network error → uses NetworkError message
 * - skip option suppresses fetching
 * - retry() refetches
 * - transform() applied to result
 * - NetworkErrorCard renders / hides correctly
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useApi, NetworkErrorCard } from '../hooks/useApi';

// Mock the api module so useApi doesn't try real fetch
vi.mock('../api', () => ({
  authFetch: vi.fn(),
  NetworkError: class NetworkError extends Error {
    constructor(msg) {
      super(msg);
      this.name = 'NetworkError';
      this.isNetwork = true;
    }
  },
}));

import { authFetch, NetworkError } from '../api';

describe('useApi', () => {
  beforeEach(() => {
    authFetch.mockReset();
  });

  it('starts in loading state and resolves with data', async () => {
    authFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ id: 1, name: 'Player' }]),
    });

    const { result } = renderHook(() => useApi('/players/', []));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);  // fallback initially

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([{ id: 1, name: 'Player' }]);
    expect(result.current.error).toBeNull();
  });

  it('falls back and sets error on HTTP error', async () => {
    authFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Server boom' }),
    });

    const { result } = renderHook(() => useApi('/players/', []));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBe('Server boom');
  });

  it('uses generic message when error body has no detail', async () => {
    authFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useApi('/x', null));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Server error (503)');
  });

  it('uses NetworkError message when fetch throws NetworkError', async () => {
    authFetch.mockRejectedValueOnce(new NetworkError('You are offline.'));

    const { result } = renderHook(() => useApi('/x', []));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('You are offline.');
    expect(result.current.data).toEqual([]);
  });

  it('uses generic message for non-network errors', async () => {
    authFetch.mockRejectedValueOnce(new Error('weird'));

    const { result } = renderHook(() => useApi('/x', null));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toContain('unexpected');
  });

  it('does not fetch when skip=true', async () => {
    const { result } = renderHook(() => useApi('/x', [], { skip: true }));
    // Wait one tick — should never fetch
    await new Promise(r => setTimeout(r, 10));
    expect(authFetch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('applies transform function to data', async () => {
    authFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([1, 2, 3]),
    });

    const { result } = renderHook(() =>
      useApi('/nums', [], { transform: (d) => d.map(n => n * 10) })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([10, 20, 30]);
  });

  it('retry() refetches', async () => {
    authFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([1]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([1, 2]),
      });

    const { result } = renderHook(() => useApi('/x', []));
    await waitFor(() => expect(result.current.data).toEqual([1]));

    result.current.retry();
    await waitFor(() => expect(result.current.data).toEqual([1, 2]));
    expect(authFetch).toHaveBeenCalledTimes(2);
  });
});

describe('NetworkErrorCard', () => {
  it('renders nothing when error is falsy', () => {
    const { container } = render(<NetworkErrorCard error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the error message', () => {
    render(<NetworkErrorCard error="Connection lost" />);
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
  });

  it('shows Retry button when onRetry provided and triggers it', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<NetworkErrorCard error="boom" onRetry={onRetry} />);
    const btn = screen.getByRole('button', { name: /retry/i });
    await user.click(btn);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('hides Retry button when onRetry not provided', () => {
    render(<NetworkErrorCard error="boom" />);
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });
});

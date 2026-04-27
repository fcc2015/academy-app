/**
 * Tests for src/api.js — auth helpers, fetch wrapper, NetworkError.
 *
 * authFetch is hard to test without mocking global fetch carefully.
 * Here we cover the deterministic, side-effect-light parts:
 *   - isAuthenticated() reading from localStorage
 *   - logout() clearing storage and redirecting
 *   - NetworkError shape
 *   - sendMessage() round-trip with fetch mocked
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isAuthenticated, logout, NetworkError, sendMessage } from '../api';

describe('NetworkError', () => {
  it('has the expected shape', () => {
    const err = new NetworkError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.name).toBe('NetworkError');
    expect(err.message).toBe('boom');
    expect(err.isNetwork).toBe(true);
  });
});

describe('isAuthenticated', () => {
  it('returns false when nothing in localStorage', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns false when only role is set', () => {
    localStorage.setItem('role', 'admin');
    expect(isAuthenticated()).toBe(false);
  });

  it('returns false when only token is set', () => {
    localStorage.setItem('token', 'abc');
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true when both role and token are set', () => {
    localStorage.setItem('role', 'parent');
    localStorage.setItem('token', 'abc');
    expect(isAuthenticated()).toBe(true);
  });
});

describe('logout', () => {
  beforeEach(() => {
    // Stub fetch so logout's fire-and-forget call doesn't escape
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response())));
    // Stub window.location.href assignment
    delete window.location;
    window.location = { href: '', pathname: '/admin' };
  });

  it('clears all auth keys from localStorage', () => {
    localStorage.setItem('role', 'parent');
    localStorage.setItem('user_id', 'u1');
    localStorage.setItem('token', 't1');
    localStorage.setItem('refresh_token', 'r1');
    localStorage.setItem('impersonating_academy_id', 'a1');
    localStorage.setItem('impersonating_academy_name', 'X');
    localStorage.setItem('token_expires', '12345');

    logout();

    expect(localStorage.getItem('role')).toBeNull();
    expect(localStorage.getItem('user_id')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('impersonating_academy_id')).toBeNull();
    expect(localStorage.getItem('impersonating_academy_name')).toBeNull();
    expect(localStorage.getItem('token_expires')).toBeNull();
  });

  it('redirects to /login for non-super_admin', () => {
    localStorage.setItem('role', 'parent');
    logout();
    expect(window.location.href).toBe('/login');
  });

  it('redirects to /saas/login for super_admin', () => {
    localStorage.setItem('role', 'super_admin');
    logout();
    expect(window.location.href).toBe('/saas/login');
  });

  it('redirects to /login when no role stored', () => {
    logout();
    expect(window.location.href).toBe('/login');
  });

  it('calls /auth/logout endpoint to clear server cookies', () => {
    logout();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });
});

describe('sendMessage', () => {
  it('posts to /chat and returns reply', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ reply: 'salam' }),
      })
    ));

    const result = await sendMessage('hello');
    expect(result).toBe('salam');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'hello' }),
      }),
    );
  });
});

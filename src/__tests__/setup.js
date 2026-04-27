// Vitest global setup — runs once before all tests.
// Imports jest-dom matchers (toBeInTheDocument, toHaveClass, etc.)
// and resets state between tests.
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

// Default localStorage state for authenticated paths — individual tests can override.
beforeEach(() => {
  localStorage.clear();
});

// Polyfills jsdom doesn't ship: navigator.onLine writability
if (typeof navigator !== 'undefined' && navigator.onLine === undefined) {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });
}

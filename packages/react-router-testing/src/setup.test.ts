import { describe, expect, test } from 'vitest';
import { setupReactRouterTest } from './setup';

// Called during collection, exactly as an app's tests/setup.ts would — this also
// proves the baked-in afterEach(cleanup) registers without throwing.
describe('setupReactRouterTest', () => {
  setupReactRouterTest({ env: { APP_NAME: 'openthrottle-email' } });

  test('installs the env override and the jsdom polyfills', () => {
    expect(window.env.APP_NAME).toBe('openthrottle-email');
    expect(window.env.APP_ENV).toBe('test');
    expect(typeof window.matchMedia).toBe('function');
  });

  test('exposes the granular escape hatches as functions', () => {
    expect(typeof setupReactRouterTest).toBe('function');
  });
});

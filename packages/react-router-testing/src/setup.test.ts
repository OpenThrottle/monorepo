import { afterAll, describe, expect, test } from 'vitest';
import { installPolyfills, uninstallPolyfills } from './polyfills';
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

// The shims patch process-global state and the top-level setupReactRouterTest()
// call above already installed them in this worker, so we cannot just assert
// "absent" — we must first restore the unpatched jsdom baseline via
// uninstallPolyfills(), then prove setupReactRouterTest({ polyfills: false })
// does NOT re-install them. Reinstall afterAll so the rest of the worker (which
// other component suites in vmForks isolation do not share, but be safe) is left
// in the patched state the default setup established.
describe('setupReactRouterTest({ polyfills: false })', () => {
  afterAll(() => {
    installPolyfills();
  });

  test('does not install the jsdom shims', () => {
    // Restore the unpatched baseline so we are not just observing the shims the
    // top-level default setup installed.
    uninstallPolyfills();
    expect(window.matchMedia).toBeUndefined();
    expect(globalThis.ResizeObserver).toBeUndefined();
    expect(Element.prototype.scrollIntoView).toBeUndefined();

    setupReactRouterTest({
      env: { APP_NAME: 'openthrottle-admin' },
      polyfills: false,
    });

    // The polyfills: false branch skipped installPolyfills entirely — shims stay absent.
    expect(window.matchMedia).toBeUndefined();
    expect(globalThis.ResizeObserver).toBeUndefined();
    expect(Element.prototype.scrollIntoView).toBeUndefined();
    // ...but the env fixture is still installed regardless of the polyfills flag.
    expect(window.env.APP_NAME).toBe('openthrottle-admin');
  });
});

import { setupReactRouterTest } from '@openthrottle/react-router-testing';

// Shared React Router test setup: jest-dom matchers, jsdom polyfills
// (matchMedia, ResizeObserver, scrollIntoView, pointer capture — which cmdk and
// the shadcn primitives reach for during render), the `window.env` fixture that
// `@openthrottle/react-router-utils` reads, and a baked-in `afterEach(cleanup)`.
// Replaces the bespoke per-package shim file so future central shims reach here.
setupReactRouterTest({ env: { APP_NAME: 'react-router-ide' } });

import { setupReactRouterTest } from '@openthrottle/react-router-testing';

// Shared React Router test setup: jest-dom matchers, jsdom polyfills
// (matchMedia, ResizeObserver, scrollIntoView, pointer capture — which the
// Schedule-X calendar also needs to mount), the `window.env` fixture that
// `@openthrottle/react-router-utils` reads, and a baked-in `afterEach(cleanup)`.
setupReactRouterTest({ env: { APP_NAME: 'react-router-ui-global' } });

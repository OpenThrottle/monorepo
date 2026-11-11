import { setupReactRouterTest } from '@openthrottle/react-router-testing';

// Shared React Router test setup: jest-dom matchers, jsdom polyfills, the
// `window.env` fixture and a baked-in `afterEach(cleanup)`.
setupReactRouterTest({ env: { APP_NAME: 'react-router-cms-ui' } });

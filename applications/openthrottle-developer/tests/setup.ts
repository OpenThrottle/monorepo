// Makes jest-dom's vitest matcher augmentation (toBeInTheDocument,
// toHaveTextContent, …) visible to TypeScript for this app's specs. The runtime
// extend already happens inside setupReactRouterTest; this import is what the TS
// program needs since it does not follow Vitest's setupFiles.
import '@testing-library/jest-dom/vitest';
import { setupReactRouterTest } from '@openthrottle/react-router-testing';
import { vi } from 'vitest';

// `webgl: true` — the GradientMesh auth screen needs a WebGL2 context and the
// global `visualViewport`, neither of which jsdom provides. The stubs used to
// live here; they moved into the shared package once the website's landing deck
// needed the same treatment.
setupReactRouterTest({
  env: { APP_NAME: 'openthrottle-developer' },
  webgl: true,
});

// Any component that mounts a graphql-ws subscription (plan/task detail routes,
// output/lifecycle streams, …) calls getGraphqlWsClient(), which in a real
// browser opens a WebSocket to API_URL_EXTERNAL. In jsdom there is no server, so
// the undici WebSocket errors *asynchronously, after the test finishes* — an
// unhandled error Vitest fails the run on. The old `vmForks` pool tore down each
// file's VM context fast enough to swallow these; `forks` keeps the process
// alive long enough to surface them, so stub the client suite-wide. Returning
// null is exactly what the real service returns during SSR / before window.env
// is populated, and every subscription hook already guards for null (so it
// simply skips subscribing — no socket, no async error). Specs that need a live
// fake client still override this with their own `vi.mock` of the same module.
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

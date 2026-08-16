// Makes jest-dom's vitest matcher augmentation (toBeInTheDocument,
// toHaveTextContent, …) visible to TypeScript for this app's specs. The runtime
// extend already happens inside setupReactRouterTest; this import is what the TS
// program needs since it does not follow Vitest's setupFiles.
import '@testing-library/jest-dom/vitest';
import { setupReactRouterTest } from '@openthrottle/react-router-testing';

// `webgl: true` — the landing deck renders GradientMesh / GlobalAnimationWaves,
// which mount a @paper-design/shaders WebGL context. jsdom has none, so without
// the stubs the shader rejects asynchronously after mount and Vitest fails the
// run on the unhandled rejection even though every assertion passes.
setupReactRouterTest({
  env: { APP_NAME: 'openthrottle-website' },
  webgl: true,
});

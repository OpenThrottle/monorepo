// Makes jest-dom's vitest matcher augmentation (toBeInTheDocument,
// toHaveTextContent, …) visible to TypeScript for this app's specs. The runtime
// extend already happens inside setupReactRouterTest; this import is what the TS
// program needs since it does not follow Vitest's setupFiles.
import '@testing-library/jest-dom/vitest';
import { setupReactRouterTest } from '@openthrottle/react-router-testing';

setupReactRouterTest({ env: { APP_NAME: 'openthrottle-admin' } });

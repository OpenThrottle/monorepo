import { loader } from '@monaco-editor/react';

/**
 * @description Tracks whether the Monaco loader has already been pointed at the
 * vendored `monaco-editor` module. Guards against repeated configuration (e.g.
 * multiple editor mounts) and the redundant dynamic import it would trigger.
 */
let configurePromise: Promise<void> | undefined;

/**
 * @description Point `@monaco-editor/react` at the locally vendored
 * `monaco-editor` package instead of letting it lazy-load the bundle from the
 * public `cdn.jsdelivr.net` CDN at runtime.
 *
 * Without this call, `@monaco-editor/react` fetches Monaco (and its language
 * workers) from a third-party CDN on first editor load. That breaks fully
 * air-gapped / offline deployments and is a supply-chain surface (a CDN
 * compromise would inject arbitrary code into the editor).
 *
 * Call this once on the client before rendering any editor component — e.g.
 * from a React Router `clientLoader`, a root client entry, or a top-level
 * `useEffect`. It is idempotent and safe to call multiple times, and resolves
 * once the loader has been configured. It must run in the browser; calling it
 * on the server is a no-op.
 *
 * `monaco-editor` is imported dynamically so the (large) module is only loaded
 * client-side and never pulled into SSR or test collection.
 *
 * Consuming Vite apps must additionally configure the Monaco language workers
 * (see this package's README for the `MonacoEnvironment` snippet) so worker
 * scripts are bundled locally rather than fetched from the CDN.
 *
 * @publicApi
 */
export const configureEditorLoader = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!configurePromise) {
    configurePromise = import('monaco-editor').then((monaco) => {
      loader.config({ monaco });
    });
  }

  await configurePromise;
};

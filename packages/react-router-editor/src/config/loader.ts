import { loader } from '@monaco-editor/react';

/**
 * @description Tracks whether the Monaco loader has already been pointed at a
 * vendored `monaco-editor` module. Guards against repeated configuration (e.g.
 * multiple editor mounts) and the redundant work it would trigger.
 */
let configured = false;

/**
 * @description Point `@monaco-editor/react` at a locally vendored
 * `monaco-editor` module instead of letting it lazy-load the bundle from the
 * public `cdn.jsdelivr.net` CDN at runtime.
 *
 * Without this call, `@monaco-editor/react` fetches Monaco (and its language
 * workers) from a third-party CDN on first editor load. That breaks fully
 * air-gapped / offline deployments and is a supply-chain surface (a CDN
 * compromise would inject arbitrary code into the editor).
 *
 * **The caller supplies the module.** This package deliberately does not
 * `import('monaco-editor')` itself: Vite emits a worker bundle for every
 * `new Worker(new URL('*.worker.js', import.meta.url))` it finds while walking
 * an import, and it does so during transform — *before* tree-shaking. A dynamic
 * import here therefore emitted Monaco's four language workers (8.66 MB) into
 * the client build of every consuming app, including apps that never render an
 * editor and never call this function. Taking the module as an argument keeps
 * that cost with the app that opts in.
 *
 * Call this once on the client before rendering any editor component — e.g.
 * from a React Router `clientLoader`, a root client entry, or a top-level
 * `useEffect`:
 *
 * ```ts
 * void import('monaco-editor').then(configureEditorLoader);
 * ```
 *
 * The consuming Vite app must additionally configure the Monaco language
 * workers (see this package's README for the `MonacoEnvironment` snippet) so
 * worker scripts are served locally rather than fetched from the CDN.
 *
 * It is idempotent and safe to call multiple times. It must run in the browser;
 * calling it on the server is a no-op.
 *
 * @public
 */
export const configureEditorLoader = (
  monaco: typeof import('monaco-editor'),
): void => {
  if (typeof window === 'undefined' || configured) {
    return;
  }

  configured = true;
  loader.config({ monaco });
};

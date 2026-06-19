import { buildDocsManifest } from '@openthrottle/react-router-docs';
import type { DocEntry } from '@openthrottle/react-router-docs';

/**
 * The app owns the `import.meta.glob` (it resolves relative to this file, so it
 * must live in app code — the shared package never globs). Vite loads every
 * Markdown file under `app/docs-content/` at build time as a raw string, and
 * the shared layer normalizes them into the docs/FAQ manifest.
 */
const modules = import.meta.glob<string>('../../../docs-content/**/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
});

export const docsManifest: readonly DocEntry[] = buildDocsManifest({ modules });

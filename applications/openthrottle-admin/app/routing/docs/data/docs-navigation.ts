import { buildDocsNav } from '@openthrottle/react-router-docs';
import { docsManifest } from '~/routing/docs/data/docsManifest';

/** Grouped docs navigation for the `docs` section (built from the app manifest). */
export const docsNav = buildDocsNav(docsManifest, 'docs');

/** Docs entries keyed by their `/docs/...` path, for slug lookups. */
export const docsBySlug = new Map(
  docsManifest
    .filter((entry) => entry.section === 'docs')
    .map((entry) => [entry.path, entry]),
);

/** The docs landing/index entry (`/docs`), when present in the manifest. */
export const indexEntry = docsManifest.find((entry) => entry.path === '/docs');

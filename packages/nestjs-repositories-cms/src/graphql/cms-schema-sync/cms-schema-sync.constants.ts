import { fileURLToPath } from 'node:url';

/**
 * @description Injection token for the directory holding one sub-folder per block package, each
 * with a `manifest.json` and its `<Typename>.schema.json` files. Override it in tests.
 * @public
 */
export const CMS_SCHEMA_MANIFESTS_DIR = 'CMS_SCHEMA_MANIFESTS_DIR';

/**
 * @description Where the package build copies the block manifests (`dist/schemas/<pkg>/`, the
 * `assets` of the `build` target). Resolved from this file, so it holds in `dist/` wherever the
 * package is installed and never depends on the repository root. Under `src/` (tests) it points at
 * a folder that does not exist, and a sync reports that instead of failing.
 * @public
 */
export const CMS_SCHEMA_MANIFESTS_DEFAULT_DIR = fileURLToPath(
  new URL('../../../schemas/', import.meta.url),
);

/**
 * @description The advisory-lock key every schema sync takes for its transaction, shared with
 * `scripts/openthrottle-database-sync-cms-schemas.ts`, so a seed and a booting server serialize.
 * @public
 */
export const CMS_SCHEMA_SYNC_LOCK_KEY = 'openthrottle-cms-schema-sync';

/**
 * @description The file name of a block package's manifest.
 * @public
 */
export const CMS_SCHEMA_MANIFEST_FILE = 'manifest.json';

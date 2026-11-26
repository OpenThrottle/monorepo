import { existsSync } from 'node:fs';

import { config as loadDotenv } from 'dotenv';

import { resolveEnvFilePaths } from './config/config.utils.ts';

/**
 * @description Load the app's `.env`, then the workspace root's, before other modules read
 * `process.env` (e.g. conditional {@link AppModule} imports and the BullMQ queue prefix) — the
 * same files `nx run` injects. dotenv never overrides a key that is already set, so the real
 * environment wins, then the app file, then the root file. `ConfigModule` still merges the app
 * file at runtime.
 */
for (const path of resolveEnvFilePaths(import.meta.dirname, existsSync)) {
  loadDotenv({ path, quiet: true });
}

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadDotenv } from 'dotenv';

/**
 * @description Load `applications/openthrottle-server/.env` before other modules read
 * `process.env` (e.g. conditional {@link AppModule} imports). `ConfigModule` still merges
 * the same file at runtime; dotenv does not override existing keys by default.
 */
const envPath = join(__dirname, '..', '.env');

if (existsSync(envPath)) {
  loadDotenv({ path: envPath });
}

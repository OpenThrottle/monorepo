/**
 * @description Dependency-free so an app's `vite.config.ts` / `vitest.config.ts` can load it
 * without pulling in the ESLint plugins behind the package root. Exposed as the
 * `@tools/dotfiles/app-version` subpath.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @description The global identifier the Vite `define` replaces. Apps declare it in
 * `app/types/global.d.ts` as `declare const __APP_VERSION__: string;`.
 */
const APP_VERSION_DEFINE_KEY = '__APP_VERSION__';

/**
 * @description Reads the `version` field of `<appRoot>/package.json`. Throws when the file or the
 * field is missing — a build with no version must fail rather than ship "undefined".
 * @public
 */
export const readAppVersion = (appRoot: string): string => {
  const manifest: unknown = JSON.parse(
    readFileSync(join(appRoot, 'package.json'), 'utf8'),
  );

  if (
    typeof manifest === 'object' &&
    manifest !== null &&
    'version' in manifest &&
    typeof manifest.version === 'string' &&
    manifest.version.length > 0
  ) {
    return manifest.version;
  }

  throw new Error(`No "version" string in ${join(appRoot, 'package.json')}`);
};

/**
 * @description Vite/Vitest `define` entry injecting the consuming app's package.json version as
 * `__APP_VERSION__`.
 * @public
 */
export const createAppVersionDefine = (
  appRoot: string,
): Record<typeof APP_VERSION_DEFINE_KEY, string> => {
  return { [APP_VERSION_DEFINE_KEY]: JSON.stringify(readAppVersion(appRoot)) };
};

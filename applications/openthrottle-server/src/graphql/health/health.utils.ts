/**
 * @description Reads the server's own version from its package.json at runtime, so a release bump
 * is the only change needed — nothing is hardcoded.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_PACKAGE_NAME = 'openthrottle-server';

interface PackageManifest {
  readonly name: string;
  readonly version: string;
}

const isPackageManifest = (value: unknown): value is PackageManifest => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'version' in value &&
    typeof value.version === 'string'
  );
};

/**
 * @description Walks up from `startDir` to the nearest package.json named `openthrottle-server` and
 * returns its `version`. Walking up (rather than a fixed `../..`) works from `src/` under
 * type-stripping, from `build/src/` after tsc, and from the pruned Docker image. Throws when no
 * such manifest exists.
 */
export const readServerVersion = (startDir: string): string => {
  let currentDir = startDir;

  for (;;) {
    try {
      const manifest: unknown = JSON.parse(
        readFileSync(join(currentDir, 'package.json'), 'utf8'),
      );

      if (
        isPackageManifest(manifest) &&
        manifest.name === SERVER_PACKAGE_NAME
      ) {
        return manifest.version;
      }
    } catch {
      // No readable package.json at this level; keep walking up.
    }

    const parentDir = dirname(currentDir);

    if (parentDir === currentDir) {
      throw new Error(
        `No ${SERVER_PACKAGE_NAME} package.json found above ${startDir}`,
      );
    }

    currentDir = parentDir;
  }
};

/**
 * @description The running server's version, resolved relative to this module.
 */
export const getServerVersion = (): string => {
  return readServerVersion(dirname(fileURLToPath(import.meta.url)));
};

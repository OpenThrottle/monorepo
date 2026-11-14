import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * @description `__APP_VERSION__` is injected by Vite `define` from this app's package.json
 * (`createAppVersionDefine`); the expected value is read from that file, never hardcoded.
 */
const readPackageVersion = (): unknown => {
  const manifest: unknown = JSON.parse(
    readFileSync(
      join(import.meta.dirname, '..', '..', '..', '..', 'package.json'),
      'utf8',
    ),
  );

  if (
    typeof manifest === 'object' &&
    manifest !== null &&
    'version' in manifest
  ) {
    return manifest.version;
  }

  return undefined;
};

describe('__APP_VERSION__', () => {
  it('is the version field of this app package.json', () => {
    expect(__APP_VERSION__).toBe(readPackageVersion());
  });

  it('is a non-empty string', () => {
    expect(typeof __APP_VERSION__).toBe('string');
    expect(__APP_VERSION__.length).toBeGreaterThan(0);
  });
});

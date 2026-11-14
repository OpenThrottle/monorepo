import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAppVersionDefine, readAppVersion } from '../app-version.ts';

describe('app-version', () => {
  let appRoot: string;

  beforeEach(() => {
    appRoot = mkdtempSync(join(tmpdir(), 'app-version-'));
  });

  afterEach(() => {
    rmSync(appRoot, { force: true, recursive: true });
  });

  describe('readAppVersion', () => {
    it('reads the version field from the app package.json', () => {
      writeFileSync(
        join(appRoot, 'package.json'),
        JSON.stringify({ name: 'x', version: '4.5.6' }),
      );

      expect(readAppVersion(appRoot)).toBe('4.5.6');
    });

    it('follows a bump of the package.json version', () => {
      writeFileSync(join(appRoot, 'package.json'), '{"version":"1.0.0"}');
      expect(readAppVersion(appRoot)).toBe('1.0.0');

      writeFileSync(join(appRoot, 'package.json'), '{"version":"1.1.0"}');
      expect(readAppVersion(appRoot)).toBe('1.1.0');
    });

    it('throws when the version field is missing', () => {
      writeFileSync(join(appRoot, 'package.json'), '{"name":"x"}');

      expect(() => readAppVersion(appRoot)).toThrow(/No "version" string/);
    });

    it('throws when package.json does not exist', () => {
      expect(() => readAppVersion(appRoot)).toThrow();
    });
  });

  describe('createAppVersionDefine', () => {
    it('returns a JSON-quoted __APP_VERSION__ entry', () => {
      writeFileSync(join(appRoot, 'package.json'), '{"version":"2.0.0"}');

      expect(createAppVersionDefine(appRoot)).toEqual({
        __APP_VERSION__: '"2.0.0"',
      });
    });

    it('matches the real dotfiles package.json, not a hardcoded value', () => {
      const packageRoot = join(import.meta.dirname, '..', '..');
      const manifest: unknown = JSON.parse(
        readFileSync(join(packageRoot, 'package.json'), 'utf8'),
      );

      expect(manifest).toHaveProperty('version', readAppVersion(packageRoot));
    });
  });
});

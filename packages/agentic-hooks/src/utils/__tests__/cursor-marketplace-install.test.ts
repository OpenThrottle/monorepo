import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  readCursorMarketplaceInstall,
  resolveCursorMarketplaceCacheDir,
} from '../cursor-marketplace-install.ts';

describe('readCursorMarketplaceInstall', () => {
  let home: string;
  let cacheDir: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'cur-mp-'));
    cacheDir = resolveCursorMarketplaceCacheDir(home);
  });

  afterEach(() => {
    fs.rmSync(home, { force: true, recursive: true });
  });

  const unpack = (sha: string, { complete }: { complete: boolean }): void => {
    const root = path.join(cacheDir, 'openthrottle', 'openthrottle', sha);
    fs.mkdirSync(path.join(root, '.cursor-plugin'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.cursor-plugin', 'plugin.json'),
      JSON.stringify({ name: 'openthrottle', version: `1.0.${sha.length}` }),
    );
    if (complete) {
      fs.writeFileSync(path.join(root, '.cache-complete'), '');
    }
  };

  describe('when nothing of Cursor’s plugin tree exists', () => {
    it('is unknown', () => {
      expect(readCursorMarketplaceInstall(cacheDir)).toEqual({
        installed: null,
        version: null,
      });
    });
  });

  describe('when the plugins directory exists but has no cache', () => {
    it('is not installed', () => {
      fs.mkdirSync(path.dirname(cacheDir), { recursive: true });

      expect(readCursorMarketplaceInstall(cacheDir)).toEqual({
        installed: false,
        version: null,
      });
    });
  });

  describe('when the cache holds other plugins only', () => {
    it('is not installed', () => {
      fs.mkdirSync(path.join(cacheDir, 'cursor-public', 'datadog', 'dde3'), {
        recursive: true,
      });

      expect(readCursorMarketplaceInstall(cacheDir)).toEqual({
        installed: false,
        version: null,
      });
    });
  });

  describe('when the unpack never finished', () => {
    it('is not installed', () => {
      unpack('abc', { complete: false });

      expect(readCursorMarketplaceInstall(cacheDir).installed).toBe(false);
    });
  });

  describe('when a finished unpack exists', () => {
    it('is installed at the manifest version', () => {
      unpack('3dbd22ff', { complete: true });

      expect(readCursorMarketplaceInstall(cacheDir)).toEqual({
        installed: true,
        version: '1.0.8',
      });
    });
  });
});

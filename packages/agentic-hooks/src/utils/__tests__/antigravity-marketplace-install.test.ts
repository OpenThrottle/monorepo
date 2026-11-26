import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  parseAntigravityPluginEnabled,
  readAntigravityMarketplaceInstall,
  resolveAntigravityPluginsDir,
} from '../antigravity-marketplace-install.ts';

describe('parseAntigravityPluginEnabled', () => {
  describe('when config.json is missing', () => {
    it('is enabled', () => {
      expect(parseAntigravityPluginEnabled(null)).toBe(true);
    });
  });

  describe('when the plugin was disabled', () => {
    it('is disabled', () => {
      expect(
        parseAntigravityPluginEnabled(
          JSON.stringify({ plugins: { openthrottle: { enabled: false } } }),
        ),
      ).toBe(false);
    });
  });

  describe('when only other plugins were toggled', () => {
    it('is enabled', () => {
      expect(
        parseAntigravityPluginEnabled(
          JSON.stringify({ plugins: { 'ot-probe': { enabled: false } } }),
        ),
      ).toBe(true);
    });
  });
});

describe('readAntigravityMarketplaceInstall', () => {
  let home: string;
  let pluginsDir: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-mp-'));
    pluginsDir = resolveAntigravityPluginsDir(home);
  });

  afterEach(() => {
    fs.rmSync(home, { force: true, recursive: true });
  });

  const install = (): void => {
    const root = path.join(pluginsDir, 'openthrottle');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(
      path.join(root, 'plugin.json'),
      JSON.stringify({ name: 'openthrottle', version: '1.3.0' }),
    );
  };

  describe('when agy has no config directory', () => {
    it('is unknown', () => {
      expect(
        readAntigravityMarketplaceInstall({ configJson: null, pluginsDir }),
      ).toEqual({ installed: null, version: null });
    });
  });

  describe('when agy is configured but has no plugins directory', () => {
    it('is not installed', () => {
      fs.mkdirSync(path.dirname(pluginsDir), { recursive: true });

      expect(
        readAntigravityMarketplaceInstall({ configJson: null, pluginsDir }),
      ).toEqual({ installed: false, version: null });
    });
  });

  describe('when the plugin is installed', () => {
    it('is installed at its manifest version', () => {
      install();

      expect(
        readAntigravityMarketplaceInstall({ configJson: null, pluginsDir }),
      ).toEqual({ installed: true, version: '1.3.0' });
    });
  });

  describe('when the plugin is installed but disabled', () => {
    it('is not installed', () => {
      install();

      expect(
        readAntigravityMarketplaceInstall({
          configJson: JSON.stringify({
            plugins: { openthrottle: { enabled: false } },
          }),
          pluginsDir,
        }),
      ).toEqual({ installed: false, version: null });
    });
  });
});

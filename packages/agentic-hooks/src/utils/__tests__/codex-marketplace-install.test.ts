import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  parseCodexPluginEnabled,
  readCodexMarketplaceInstall,
  resolveCodexHome,
  resolveCodexMarketplaceCacheDir,
} from '../codex-marketplace-install.ts';

/** The table `codex plugin add openthrottle@openthrottle` writes, as measured on 0.167.0. */
const INSTALLED_TOML = `[marketplaces.openthrottle]
source_type = "local"
source = "/work/monorepo"

[plugins."openthrottle@openthrottle"]
enabled = true
`;

describe('resolveCodexHome', () => {
  describe('when CODEX_HOME is set', () => {
    it('uses it', () => {
      expect(resolveCodexHome({ CODEX_HOME: '/srv/codex' }, '/home/me')).toBe(
        '/srv/codex',
      );
    });
  });

  describe('when CODEX_HOME is unset', () => {
    it('is ~/.codex', () => {
      expect(resolveCodexHome({}, '/home/me')).toBe('/home/me/.codex');
    });
  });
});

describe('parseCodexPluginEnabled', () => {
  describe('when config.toml is unreadable', () => {
    it('is unknown', () => {
      expect(parseCodexPluginEnabled(null)).toBeNull();
    });
  });

  describe('when the plugin table is absent', () => {
    it('is false', () => {
      expect(
        parseCodexPluginEnabled('[plugins."pdf@openai-primary-runtime"]\n'),
      ).toBe(false);
    });
  });

  describe('when the table enables the plugin', () => {
    it('is true', () => {
      expect(parseCodexPluginEnabled(INSTALLED_TOML)).toBe(true);
    });
  });

  describe('when the table disables the plugin', () => {
    it('is false', () => {
      expect(
        parseCodexPluginEnabled(
          `[plugins.'openthrottle@openthrottle'] # mine\nenabled = false\n`,
        ),
      ).toBe(false);
    });
  });

  describe('when the table has no enabled key', () => {
    it('reads the next table’s key as no evidence and is true', () => {
      expect(
        parseCodexPluginEnabled(
          '[plugins."openthrottle@openthrottle"]\n\n[plugins."x@y"]\nenabled = false\n',
        ),
      ).toBe(true);
    });
  });
});

describe('readCodexMarketplaceInstall', () => {
  let codexHome: string;
  let cacheDir: string;

  beforeEach(() => {
    codexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-mp-'));
    cacheDir = resolveCodexMarketplaceCacheDir(codexHome);
  });

  afterEach(() => {
    fs.rmSync(codexHome, { force: true, recursive: true });
  });

  describe('when the config enables it and the cache holds a version', () => {
    it('is installed at that version', () => {
      const root = path.join(cacheDir, 'openthrottle', 'openthrottle', '1.3.0');
      fs.mkdirSync(root, { recursive: true });
      fs.writeFileSync(
        path.join(root, 'plugin.json'),
        JSON.stringify({ name: 'openthrottle', version: '1.3.0' }),
      );

      expect(
        readCodexMarketplaceInstall({ cacheDir, configToml: INSTALLED_TOML }),
      ).toEqual({ installed: true, version: '1.3.0' });
    });
  });

  describe('when the config enables it but the cache is gone', () => {
    it('is installed with no version', () => {
      expect(
        readCodexMarketplaceInstall({ cacheDir, configToml: INSTALLED_TOML }),
      ).toEqual({ installed: true, version: null });
    });
  });

  describe('when the config has no table', () => {
    it('is not installed', () => {
      expect(readCodexMarketplaceInstall({ cacheDir, configToml: '' })).toEqual(
        { installed: false, version: null },
      );
    });
  });

  describe('when config.toml is unreadable', () => {
    it('is unknown', () => {
      expect(
        readCodexMarketplaceInstall({ cacheDir, configToml: null }),
      ).toEqual({ installed: null, version: null });
    });
  });
});

import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  detectDeliveryLeg,
  parseMarketplaceInstall,
  resolveClaudeConfigDir,
} from '../claude-heartbeat.ts';

const HOME = '/home/someone';
const CACHE = path.join(HOME, '.claude', 'plugins', 'cache');
const CACHED_ROOT = path.join(CACHE, 'openthrottle', 'openthrottle', '1.2.0');

describe('detectDeliveryLeg', () => {
  describe('when OPENTHROTTLE_HOOK_DELIVERY=plugin-dir', () => {
    it('reports plugin-dir even under the marketplace cache', () => {
      expect(
        detectDeliveryLeg({
          env: {
            CLAUDE_PLUGIN_ROOT: CACHED_ROOT,
            OPENTHROTTLE_HOOK_DELIVERY: 'plugin-dir',
          },
          homeDir: HOME,
        }),
      ).toBe('plugin-dir');
    });
  });

  describe('when CLAUDE_PLUGIN_ROOT is under <config dir>/plugins/cache/', () => {
    it('reports marketplace', () => {
      expect(
        detectDeliveryLeg({
          env: { CLAUDE_PLUGIN_ROOT: CACHED_ROOT },
          homeDir: HOME,
        }),
      ).toBe('marketplace');
    });

    it('honours CLAUDE_CONFIG_DIR', () => {
      const root = '/custom/claude/plugins/cache/openthrottle/openthrottle/1';
      expect(
        detectDeliveryLeg({
          env: {
            CLAUDE_CONFIG_DIR: '/custom/claude',
            CLAUDE_PLUGIN_ROOT: root,
          },
          homeDir: HOME,
        }),
      ).toBe('marketplace');
      expect(
        detectDeliveryLeg({
          env: { CLAUDE_PLUGIN_ROOT: root },
          homeDir: HOME,
        }),
      ).toBe('plugin-dir');
    });
  });

  describe('when CLAUDE_PLUGIN_ROOT is set elsewhere', () => {
    it('reports plugin-dir', () => {
      expect(
        detectDeliveryLeg({
          env: { CLAUDE_PLUGIN_ROOT: '/srv/openthrottle/plugins/openthrottle' },
          homeDir: HOME,
        }),
      ).toBe('plugin-dir');
    });

    it('does not mistake the cache directory itself or a sibling for a cached plugin', () => {
      expect(
        detectDeliveryLeg({
          env: { CLAUDE_PLUGIN_ROOT: CACHE },
          homeDir: HOME,
        }),
      ).toBe('plugin-dir');
      expect(
        detectDeliveryLeg({
          env: { CLAUDE_PLUGIN_ROOT: `${CACHE}-evil/x` },
          homeDir: HOME,
        }),
      ).toBe('plugin-dir');
    });
  });

  describe('when there is no CLAUDE_PLUGIN_ROOT', () => {
    it('reports repo', () => {
      expect(detectDeliveryLeg({ env: {}, homeDir: HOME })).toBe('repo');
      expect(
        detectDeliveryLeg({ env: { CLAUDE_PLUGIN_ROOT: '  ' }, homeDir: HOME }),
      ).toBe('repo');
    });
  });
});

describe('resolveClaudeConfigDir', () => {
  it('defaults to ~/.claude', () => {
    expect(resolveClaudeConfigDir({}, HOME)).toBe(path.join(HOME, '.claude'));
  });

  it('prefers CLAUDE_CONFIG_DIR', () => {
    expect(resolveClaudeConfigDir({ CLAUDE_CONFIG_DIR: '/x/cfg' }, HOME)).toBe(
      '/x/cfg',
    );
  });
});

describe('parseMarketplaceInstall', () => {
  const file = (plugins: unknown): string => {
    return JSON.stringify({ plugins, version: 2 });
  };

  describe('when the plugin is installed', () => {
    it('reports true and the first entry version', () => {
      expect(
        parseMarketplaceInstall(
          file({
            'openthrottle@openthrottle': [
              { scope: 'user', version: '1.1.0' },
              { scope: 'project', version: '0.9.0' },
            ],
          }),
        ),
      ).toEqual({ installed: true, version: '1.1.0' });
    });

    it('reports a null version when the entry carries none', () => {
      expect(
        parseMarketplaceInstall(file({ 'openthrottle@openthrottle': [{}] })),
      ).toEqual({ installed: true, version: null });
    });
  });

  describe('when the file is readable but the key is absent', () => {
    it('reports false', () => {
      expect(
        parseMarketplaceInstall(file({ 'other@market': [{ version: '1' }] })),
      ).toEqual({ installed: false, version: null });
      expect(
        parseMarketplaceInstall(file({ 'openthrottle@openthrottle': [] })),
      ).toEqual({ installed: false, version: null });
    });
  });

  describe('when the file is unreadable or malformed', () => {
    it('reports unknown', () => {
      const unknown = { installed: null, version: null };
      expect(parseMarketplaceInstall(null)).toEqual(unknown);
      expect(parseMarketplaceInstall('{not json')).toEqual(unknown);
      expect(parseMarketplaceInstall('[]')).toEqual(unknown);
      expect(parseMarketplaceInstall('{"plugins": 3}')).toEqual(unknown);
      expect(
        parseMarketplaceInstall(file({ 'openthrottle@openthrottle': 'yes' })),
      ).toEqual(unknown);
    });
  });
});

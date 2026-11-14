import { describe, expect, it } from 'vitest';

import {
  formatPluginFixCommand,
  parseMarketplaceKnown,
  planPluginFix,
} from '../doctor-fix.ts';

describe('parseMarketplaceKnown', () => {
  it('is true when the registry lists the openthrottle marketplace', () => {
    const raw = JSON.stringify({
      openthrottle: { source: { repo: 'OpenThrottle/monorepo' } },
    });
    expect(parseMarketplaceKnown(raw)).toBe(true);
  });

  it('is false for a registry without it, unreadable text, or garbage', () => {
    expect(parseMarketplaceKnown(JSON.stringify({ other: {} }))).toBe(false);
    expect(parseMarketplaceKnown(null)).toBe(false);
    expect(parseMarketplaceKnown('{not json')).toBe(false);
  });
});

describe('planPluginFix', () => {
  describe('when the plugin is not installed', () => {
    it('adds the marketplace, then installs', () => {
      expect(
        planPluginFix({
          install: { installed: false, version: null },
          marketplaceKnown: false,
          payloadVersion: '1.2.0',
        }),
      ).toEqual({
        commands: [
          ['plugin', 'marketplace', 'add', 'OpenThrottle/monorepo'],
          ['plugin', 'install', 'openthrottle@openthrottle'],
        ],
        kind: 'install',
      });
    });

    it('skips the marketplace add when it is already known', () => {
      expect(
        planPluginFix({
          install: { installed: false, version: null },
          marketplaceKnown: true,
          payloadVersion: null,
        }),
      ).toEqual({
        commands: [['plugin', 'install', 'openthrottle@openthrottle']],
        kind: 'install',
      });
    });

    it('treats an unreadable registry as not installed, like the plugin check', () => {
      expect(
        planPluginFix({
          install: { installed: null, version: null },
          marketplaceKnown: true,
          payloadVersion: null,
        }).kind,
      ).toBe('install');
    });
  });

  describe('when the plugin is installed', () => {
    it('updates an older version', () => {
      expect(
        planPluginFix({
          install: { installed: true, version: '1.1.0' },
          marketplaceKnown: true,
          payloadVersion: '1.2.0',
        }),
      ).toEqual({
        commands: [['plugin', 'update', 'openthrottle@openthrottle']],
        kind: 'update',
      });
    });

    it('needs nothing when current, newer, or not comparable', () => {
      const cases = [
        { payloadVersion: '1.2.0', version: '1.2.0' },
        { payloadVersion: '1.2.0', version: '1.3.0' },
        { payloadVersion: null, version: '1.2.0' },
        { payloadVersion: '1.2.0', version: null },
      ];
      for (const { payloadVersion, version } of cases) {
        expect(
          planPluginFix({
            install: { installed: true, version },
            marketplaceKnown: true,
            payloadVersion,
          }),
        ).toEqual({ kind: 'none' });
      }
    });
  });
});

describe('formatPluginFixCommand', () => {
  it('joins the binary and argv, quoting a binary path with whitespace', () => {
    expect(formatPluginFixCommand('claude', ['plugin', 'update', 'x'])).toBe(
      'claude plugin update x',
    );
    expect(formatPluginFixCommand('/a b/claude', ['plugin'])).toBe(
      '"/a b/claude" plugin',
    );
  });
});

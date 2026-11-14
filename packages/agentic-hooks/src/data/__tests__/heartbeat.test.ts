import { describe, expect, it } from 'vitest';

import {
  buildHeartbeatInput,
  detectDeliveryLeg,
  detectDeliveryLegFromScript,
  isPathInside,
  readHookPayloadCwd,
  readVersionField,
  sanitizeMachineLabel,
} from '../heartbeat.ts';
import type { BufferStats } from '../readBufferStats.ts';

const CACHE = '/home/someone/.tool/plugins/cache';

describe('isPathInside', () => {
  it('is true only for a strict descendant', () => {
    expect(isPathInside('/a/b', '/a/b/c')).toBe(true);
    expect(isPathInside('/a/b', '/a/b')).toBe(false);
    expect(isPathInside('/a/b', '/a/bc')).toBe(false);
    expect(isPathInside('/a/b', '/a')).toBe(false);
  });
});

describe('detectDeliveryLeg', () => {
  describe('when the driver stamped OPENTHROTTLE_HOOK_DELIVERY=plugin-dir', () => {
    it('is plugin-dir, whatever the plugin root says', () => {
      expect(
        detectDeliveryLeg({
          env: { OPENTHROTTLE_HOOK_DELIVERY: 'plugin-dir' },
          marketplaceCacheDir: CACHE,
          pluginRoot: null,
        }),
      ).toBe('plugin-dir');
    });
  });

  describe('when there is no plugin root', () => {
    it('is repo', () => {
      expect(
        detectDeliveryLeg({
          env: {},
          marketplaceCacheDir: CACHE,
          pluginRoot: '  ',
        }),
      ).toBe('repo');
    });
  });

  describe('when the plugin root is under the marketplace cache', () => {
    it('is marketplace', () => {
      expect(
        detectDeliveryLeg({
          env: {},
          marketplaceCacheDir: CACHE,
          pluginRoot: `${CACHE}/openthrottle/1.0.0`,
        }),
      ).toBe('marketplace');
    });
  });

  describe('when the plugin root is anywhere else', () => {
    it('is plugin-dir, including for a tool with no known cache', () => {
      expect(
        detectDeliveryLeg({
          env: {},
          marketplaceCacheDir: null,
          pluginRoot: '/opt/payload',
        }),
      ).toBe('plugin-dir');
    });
  });
});

describe('detectDeliveryLegFromScript', () => {
  const repoRoot = '/work/repo';

  describe('when the script lives inside the repository', () => {
    it('is repo', () => {
      expect(
        detectDeliveryLegFromScript({
          env: {},
          marketplaceCacheDir: null,
          repoRoot,
          scriptPath: '/work/repo/.tool/hooks/skill-usage-heartbeat.cjs',
        }),
      ).toBe('repo');
    });
  });

  describe('when out-of-repo config points at a bundle elsewhere', () => {
    it('is plugin-dir', () => {
      expect(
        detectDeliveryLegFromScript({
          env: {},
          marketplaceCacheDir: null,
          repoRoot,
          scriptPath: '/home/me/ot/.tool/hooks/skill-usage-heartbeat.cjs',
        }),
      ).toBe('plugin-dir');
    });
  });

  describe('when the script lives under the tool’s marketplace cache', () => {
    it('is marketplace', () => {
      expect(
        detectDeliveryLegFromScript({
          env: {},
          marketplaceCacheDir: '/home/me/.codex/plugins/cache',
          repoRoot,
          scriptPath: `/home/me/.codex/plugins/cache/openthrottle/openthrottle/1.3.0/hooks/x.cjs`,
        }),
      ).toBe('marketplace');
    });
  });

  describe('when the driver stamped plugin-dir', () => {
    it('is plugin-dir even for an in-repo script', () => {
      expect(
        detectDeliveryLegFromScript({
          env: { OPENTHROTTLE_HOOK_DELIVERY: 'plugin-dir' },
          marketplaceCacheDir: null,
          repoRoot,
          scriptPath: '/work/repo/x.cjs',
        }),
      ).toBe('plugin-dir');
    });
  });

  describe('when the script path is unknown', () => {
    it('is repo', () => {
      expect(
        detectDeliveryLegFromScript({
          env: {},
          marketplaceCacheDir: null,
          repoRoot,
          scriptPath: undefined,
        }),
      ).toBe('repo');
    });
  });
});

describe('readHookPayloadCwd', () => {
  it('reads a non-empty string cwd', () => {
    expect(readHookPayloadCwd('{"cwd":"/work/repo"}')).toBe('/work/repo');
  });

  it('is null for a missing, empty or non-string cwd, or text that is not JSON', () => {
    expect(readHookPayloadCwd('{}')).toBeNull();
    expect(readHookPayloadCwd('{"cwd":""}')).toBeNull();
    expect(readHookPayloadCwd('{"cwd":3}')).toBeNull();
    expect(readHookPayloadCwd('')).toBeNull();
    expect(readHookPayloadCwd('nope')).toBeNull();
  });
});

describe('sanitizeMachineLabel', () => {
  it('trims, caps at 64 characters and nulls blanks', () => {
    expect(sanitizeMachineLabel('  work laptop ')).toBe('work laptop');
    expect(sanitizeMachineLabel('x'.repeat(100))).toHaveLength(64);
    expect(sanitizeMachineLabel('   ')).toBeNull();
    expect(sanitizeMachineLabel('')).toBeNull();
  });
});

describe('readVersionField', () => {
  it('reads a string version and rejects everything else', () => {
    expect(readVersionField('{"version":"1.2.0"}')).toBe('1.2.0');
    expect(readVersionField('{"version":3}')).toBeNull();
    expect(readVersionField('nope')).toBeNull();
  });
});

describe('buildHeartbeatInput', () => {
  const stats: BufferStats = {
    files: [
      { deadLetterLines: 1, label: 'events', lines: 4, oldestAt: null },
      { deadLetterLines: 0, label: 'outcomes', lines: 2, oldestAt: null },
      { deadLetterLines: 0, label: 'token-usage', lines: 7, oldestAt: null },
      { deadLetterLines: 2, label: 'trajectories', lines: 1, oldestAt: null },
    ],
    oldestAt: '2026-11-01T00:00:00.000Z',
    totalDeadLetterLines: 3,
    totalLines: 14,
  };

  it('maps buffer stats and facts onto the mutation input', () => {
    expect(
      buildHeartbeatInput({
        bufferStats: stats,
        deliveryLeg: 'repo',
        machineId: 'abc-12345678',
        machineLabel: null,
        marketplace: { installed: false, version: null },
        now: new Date('2026-11-13T10:00:00.000Z'),
        pluginVersion: null,
        repoIdentity: 'https://github.com/org/repo',
        source: 'producer-a',
      }),
    ).toEqual({
      bufferedEvents: 4,
      bufferedOutcomes: 2,
      bufferedTokenUsage: 7,
      bufferedTrajectories: 1,
      deadLetterCount: 3,
      deliveryLeg: 'repo',
      machineId: 'abc-12345678',
      machineLabel: null,
      marketplacePluginInstalled: false,
      marketplacePluginVersion: null,
      occurredAt: '2026-11-13T10:00:00.000Z',
      oldestBufferedAt: '2026-11-01T00:00:00.000Z',
      pluginVersion: null,
      repoIdentity: 'https://github.com/org/repo',
      source: 'producer-a',
    });
  });
});

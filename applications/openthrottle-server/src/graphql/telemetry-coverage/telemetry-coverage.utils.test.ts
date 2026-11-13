import type { TelemetryHeartbeat } from '@openthrottle/nestjs-repositories';
import { describe, expect, test } from 'vitest';

import {
  buildMachineCoverage,
  compareSemver,
  computeWarnings,
  groupRepos,
  isBufferGrowing,
  isBufferStale,
  isMachineSilent,
  isManualSessionsUncovered,
  isPluginOutdated,
  readCurrentPluginVersion,
} from './telemetry-coverage.utils.ts';

const now = new Date('2026-11-13T12:00:00.000Z');
const options = { currentPluginVersion: '1.2.0', now, windowDays: 14 };

function row(overrides: Partial<TelemetryHeartbeat>): TelemetryHeartbeat {
  return {
    bufferedEvents: 0,
    bufferedOutcomes: 0,
    bufferedTokenUsage: 0,
    bufferedTrajectories: 0,
    deadLetterCount: 0,
    deliveryLeg: 'marketplace',
    firstSeenAt: now,
    id: 'id',
    lastSeenAt: now,
    machineId: 'm1',
    machineLabel: null,
    marketplacePluginInstalled: true,
    marketplacePluginVersion: '1.2.0',
    oldestBufferedAt: null,
    pluginVersion: null,
    recentBufferedTotals: [],
    repoIdentity: 'github.com/org/repo',
    source: 'claude-code',
    userId: 'u1',
    ...overrides,
  };
}

describe('compareSemver', () => {
  test('orders numerically, not lexically', () => {
    expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareSemver('1.2.0', '1.10.0')).toBeLessThan(0);
  });

  test('treats missing parts as zero and equal versions as 0', () => {
    expect(compareSemver('1.2', '1.2.0')).toBe(0);
  });

  test('ignores a leading v and pre-release suffix', () => {
    expect(compareSemver('v1.2.0-beta.1', '1.2.0')).toBe(0);
  });

  test('returns null for non-numeric input', () => {
    expect(compareSemver('abc', '1.0.0')).toBeNull();
  });
});

describe('isManualSessionsUncovered', () => {
  test('fires only on an explicit false', () => {
    expect(
      isManualSessionsUncovered(row({ marketplacePluginInstalled: false })),
    ).toBe(true);
    expect(
      isManualSessionsUncovered(row({ marketplacePluginInstalled: true })),
    ).toBe(false);
    expect(
      isManualSessionsUncovered(row({ marketplacePluginInstalled: null })),
    ).toBe(false);
  });
});

describe('isPluginOutdated', () => {
  test('fires when installed is lower than current', () => {
    expect(isPluginOutdated('1.1.9', '1.2.0')).toBe(true);
  });

  test('does not fire when equal, higher, absent or unparseable', () => {
    expect(isPluginOutdated('1.2.0', '1.2.0')).toBe(false);
    expect(isPluginOutdated('1.3.0', '1.2.0')).toBe(false);
    expect(isPluginOutdated(null, '1.2.0')).toBe(false);
    expect(isPluginOutdated('1.0.0', null)).toBe(false);
    expect(isPluginOutdated('dev', '1.2.0')).toBe(false);
  });
});

describe('isBufferStale', () => {
  test('exactly 24h is not stale', () => {
    expect(isBufferStale(new Date(now.getTime() - 24 * 3_600_000), now)).toBe(
      false,
    );
  });

  test('older than 24h is stale', () => {
    expect(
      isBufferStale(new Date(now.getTime() - 24 * 3_600_000 - 1), now),
    ).toBe(true);
  });

  test('null is never stale', () => {
    expect(isBufferStale(null, now)).toBe(false);
  });
});

describe('isBufferGrowing', () => {
  test('fires on three strictly increasing entries', () => {
    expect(isBufferGrowing([1, 2, 3])).toBe(true);
  });

  test('does not fire on plateau, decrease or fewer than three', () => {
    expect(isBufferGrowing([1, 1, 2])).toBe(false);
    expect(isBufferGrowing([3, 2, 5])).toBe(false);
    expect(isBufferGrowing([1, 2])).toBe(false);
    expect(isBufferGrowing([])).toBe(false);
  });
});

describe('isMachineSilent', () => {
  const windowStart = new Date(now.getTime() - 14 * 86_400_000);

  test('fires when every row is older than the window', () => {
    expect(
      isMachineSilent(
        [row({ lastSeenAt: new Date(windowStart.getTime() - 1) })],
        windowStart,
      ),
    ).toBe(true);
  });

  test('does not fire with a row at the window start', () => {
    expect(
      isMachineSilent([row({ lastSeenAt: windowStart })], windowStart),
    ).toBe(false);
  });

  test('does not fire for a machine with no rows', () => {
    expect(isMachineSilent([], windowStart)).toBe(false);
  });
});

describe('computeWarnings', () => {
  test('is empty for a healthy machine', () => {
    expect(computeWarnings([row({})], options)).toEqual([]);
  });

  test('uses the newest row for the point-in-time rules', () => {
    const rows = [
      row({
        lastSeenAt: new Date('2026-11-01T00:00:00.000Z'),
        marketplacePluginInstalled: false,
      }),
      row({ marketplacePluginInstalled: true }),
    ];
    expect(computeWarnings(rows, options)).toEqual([]);
  });

  test('emits every rule in order with kind and message', () => {
    const rows = [
      row({
        marketplacePluginInstalled: false,
        marketplacePluginVersion: '1.0.0',
        oldestBufferedAt: new Date(now.getTime() - 48 * 3_600_000),
        recentBufferedTotals: [1, 2, 3],
      }),
    ];
    const kinds = computeWarnings(rows, options).map((w) => w.kind);
    expect(kinds).toEqual([
      'MANUAL_SESSIONS_UNCOVERED',
      'PLUGIN_OUTDATED',
      'BUFFER_STALE',
      'BUFFER_GROWING',
    ]);
  });

  test('flags a silent machine', () => {
    const rows = [row({ lastSeenAt: new Date('2026-10-01T00:00:00.000Z') })];
    expect(computeWarnings(rows, options).map((w) => w.kind)).toEqual([
      'MACHINE_SILENT',
    ]);
  });

  test('skips PLUGIN_OUTDATED when the current version is unknown', () => {
    const rows = [row({ marketplacePluginVersion: '0.1.0' })];
    expect(
      computeWarnings(rows, { ...options, currentPluginVersion: null }),
    ).toEqual([]);
  });
});

describe('groupRepos', () => {
  test('groups by repo, null repo included, deduping legs to newest', () => {
    const older = new Date('2026-11-10T00:00:00.000Z');
    const repos = groupRepos([
      row({ deliveryLeg: 'repo', lastSeenAt: older }),
      row({ deliveryLeg: 'marketplace' }),
      row({ deliveryLeg: 'marketplace', lastSeenAt: older, source: 'other' }),
      row({ deliveryLeg: 'plugin-dir', lastSeenAt: older, repoIdentity: null }),
    ]);
    expect(repos).toEqual([
      {
        deliveryLegs: [
          { deliveryLeg: 'marketplace', lastSeenAt: now },
          { deliveryLeg: 'repo', lastSeenAt: older },
        ],
        repoIdentity: 'github.com/org/repo',
      },
      {
        deliveryLegs: [{ deliveryLeg: 'plugin-dir', lastSeenAt: older }],
        repoIdentity: null,
      },
    ]);
  });
});

describe('buildMachineCoverage', () => {
  test('groups by machine, orders by lastSeenAt desc, builds the snapshot', () => {
    const older = new Date('2026-11-12T00:00:00.000Z');
    const machines = buildMachineCoverage(
      [
        row({ lastSeenAt: older, machineId: 'm2', machineLabel: 'laptop' }),
        row({
          bufferedEvents: 2,
          bufferedOutcomes: 3,
          machineId: 'm1',
          pluginVersion: null,
        }),
        row({
          deliveryLeg: 'repo',
          lastSeenAt: older,
          machineId: 'm1',
          pluginVersion: '1.1.0',
        }),
      ],
      options,
    );
    expect(machines.map((m) => m.machineId)).toEqual(['m1', 'm2']);
    const [first] = machines;
    expect(first?.deliveryLegsSeen).toEqual(['marketplace', 'repo']);
    expect(first?.pluginVersion).toBe('1.1.0');
    expect(first?.buffer.totalBuffered).toBe(5);
    expect(machines[1]?.machineLabel).toBe('laptop');
  });

  test('returns an empty list for no rows', () => {
    expect(buildMachineCoverage([], options)).toEqual([]);
  });
});

describe('readCurrentPluginVersion', () => {
  test('is null without a root or when the manifest is missing', () => {
    expect(readCurrentPluginVersion(undefined)).toBeNull();
    expect(readCurrentPluginVersion('/nonexistent-root')).toBeNull();
  });
});

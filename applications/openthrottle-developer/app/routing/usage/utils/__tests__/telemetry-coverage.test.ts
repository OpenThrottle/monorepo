import { describe, expect, test } from 'vitest';

import { TELEMETRY_WARNING_KINDS } from '~/routing/usage/data/data.telemetry-coverage-copy';
import {
  buildTelemetryMachine,
  telemetryHoursAgo,
} from '~/routing/usage/utils/__tests__/telemetry-coverage-fixtures';
import {
  countMachineWarnings,
  deliveryLegLabel,
  groupTelemetryWarnings,
  hasDeliveryLeg,
  machineDisplayName,
  pluginDisplay,
  repoDisplayName,
  repoLegSummary,
  shortMachineId,
  telemetryWarningVariant,
} from '~/routing/usage/utils/telemetry-coverage';

describe('shortMachineId', () => {
  test('keeps the first 8 characters', () => {
    expect(shortMachineId('0123456789abcdef')).toBe('01234567');
  });

  test('returns a short id unchanged', () => {
    expect(shortMachineId('abc')).toBe('abc');
  });
});

describe('machineDisplayName', () => {
  test('prefers the label', () => {
    expect(machineDisplayName(buildTelemetryMachine())).toBe('work-laptop');
  });

  test('falls back to the short id for a null or blank label', () => {
    expect(
      machineDisplayName(buildTelemetryMachine({ machineLabel: null })),
    ).toBe('01234567');
    expect(
      machineDisplayName(buildTelemetryMachine({ machineLabel: '  ' })),
    ).toBe('01234567');
  });
});

describe('repoDisplayName', () => {
  test.each([
    ['https://github.com/OpenThrottle/monorepo.git', 'OpenThrottle/monorepo'],
    ['https://github.com/OpenThrottle/monorepo', 'OpenThrottle/monorepo'],
    ['git@github.com:OpenThrottle/monorepo.git', 'OpenThrottle/monorepo'],
    ['ssh://git@host.example/org/repo.git', 'org/repo'],
    ['https://gitlab.com/group/sub/repo.git', 'sub/repo'],
  ])('derives org/repo from %s', (url, expected) => {
    expect(repoDisplayName(url)).toBe(expected);
  });

  test('returns null when there is no remote', () => {
    expect(repoDisplayName(null)).toBeNull();
    expect(repoDisplayName('')).toBeNull();
  });

  test('returns an unrecognizable value as-is', () => {
    expect(repoDisplayName('local-only')).toBe('local-only');
  });
});

describe('deliveryLegLabel', () => {
  test('maps the known legs', () => {
    expect(deliveryLegLabel('repo')).toBe('Repo hooks');
    expect(deliveryLegLabel('plugin-dir')).toBe('OT runs');
    expect(deliveryLegLabel('marketplace')).toBe('Plugin');
  });

  test('falls back to the raw id', () => {
    expect(deliveryLegLabel('future-leg')).toBe('future-leg');
  });
});

describe('hasDeliveryLeg', () => {
  test('reports whether the leg was seen', () => {
    const machine = buildTelemetryMachine();

    expect(hasDeliveryLeg(machine, 'repo')).toBe(true);
    expect(hasDeliveryLeg(machine, 'plugin-dir')).toBe(false);
  });
});

describe('pluginDisplay', () => {
  test('shows the version when installed', () => {
    expect(pluginDisplay(buildTelemetryMachine())).toBe('1.2.0');
  });

  test('shows Installed when the version is unknown', () => {
    expect(
      pluginDisplay(buildTelemetryMachine({ marketplacePluginVersion: null })),
    ).toBe('Installed');
  });

  test('shows Not installed when the plugin is absent', () => {
    expect(
      pluginDisplay(
        buildTelemetryMachine({ marketplacePluginInstalled: false }),
      ),
    ).toBe('Not installed');
  });

  test('shows Unknown when the heartbeat did not say', () => {
    expect(
      pluginDisplay(
        buildTelemetryMachine({ marketplacePluginInstalled: null }),
      ),
    ).toBe('Unknown');
  });
});

describe('groupTelemetryWarnings', () => {
  test('dedupes per machine and kind and orders by severity', () => {
    const first = buildTelemetryMachine({
      machineId: 'aaaaaaaa1',
      warnings: [
        { kind: 'BUFFER_GROWING', message: 'a' },
        { kind: 'BUFFER_GROWING', message: 'a again' },
        { kind: 'DEAD_LETTERED', message: 'f' },
        { kind: 'MANUAL_SESSIONS_UNCOVERED', message: 'b' },
      ],
    });
    const second = buildTelemetryMachine({
      machineId: 'bbbbbbbb2',
      warnings: [
        { kind: 'MANUAL_SESSIONS_UNCOVERED', message: 'c' },
        { kind: 'SOMETHING_NEW', message: 'd' },
        { kind: 'MACHINE_SILENT', message: 'e' },
      ],
    });

    expect(
      groupTelemetryWarnings([first, second]).map((entry) => entry.key),
    ).toEqual([
      'bbbbbbbb2:MACHINE_SILENT',
      'aaaaaaaa1:MANUAL_SESSIONS_UNCOVERED',
      'bbbbbbbb2:MANUAL_SESSIONS_UNCOVERED',
      'aaaaaaaa1:DEAD_LETTERED',
      'aaaaaaaa1:BUFFER_GROWING',
      'bbbbbbbb2:SOMETHING_NEW',
    ]);
  });

  test('returns nothing for healthy machines', () => {
    expect(groupTelemetryWarnings([buildTelemetryMachine()])).toEqual([]);
  });
});

describe('countMachineWarnings', () => {
  test('counts distinct kinds', () => {
    expect(
      countMachineWarnings({
        warnings: [
          { kind: 'A', message: '' },
          { kind: 'A', message: '' },
          { kind: 'B', message: '' },
        ],
      }),
    ).toBe(2);
  });
});

describe('repoLegSummary', () => {
  test('joins each leg with its relative last-seen', () => {
    const repo = {
      deliveryLegs: [
        { deliveryLeg: 'repo', lastSeenAt: telemetryHoursAgo(2) },
        { deliveryLeg: 'marketplace', lastSeenAt: telemetryHoursAgo(30) },
      ],
    };

    expect(repoLegSummary(repo, (iso) => `at ${iso.slice(11, 13)}`)).toBe(
      'Repo hooks at 10, Plugin at 06',
    );
  });
});

describe('telemetryWarningVariant', () => {
  test('is destructive only for uncovered manual sessions', () => {
    expect(
      telemetryWarningVariant(
        TELEMETRY_WARNING_KINDS.MANUAL_SESSIONS_UNCOVERED,
      ),
    ).toBe('destructive');
    expect(telemetryWarningVariant(TELEMETRY_WARNING_KINDS.BUFFER_STALE)).toBe(
      'default',
    );
  });
});

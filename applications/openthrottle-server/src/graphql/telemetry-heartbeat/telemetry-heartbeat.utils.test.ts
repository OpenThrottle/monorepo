import { describe, expect, test } from 'vitest';

import {
  coverageAlertMachineName,
  coverageAlertMessage,
  newCoverageWarnings,
} from './telemetry-heartbeat.utils.ts';

const warning = (kind: string): { kind: string; message: string } => {
  return { kind, message: `${kind} message` };
};

describe('newCoverageWarnings', () => {
  test('returns only kinds absent before', () => {
    expect(
      newCoverageWarnings(
        [warning('BUFFER_STALE')],
        [warning('BUFFER_STALE'), warning('DEAD_LETTERED')],
      ),
    ).toEqual([warning('DEAD_LETTERED')]);
  });

  test('treats every warning on a first heartbeat as new', () => {
    expect(
      newCoverageWarnings([], [warning('MANUAL_SESSIONS_UNCOVERED')]),
    ).toEqual([warning('MANUAL_SESSIONS_UNCOVERED')]);
  });

  test('never returns MACHINE_SILENT', () => {
    expect(newCoverageWarnings([], [warning('MACHINE_SILENT')])).toEqual([]);
  });

  test('returns nothing when warnings only cleared', () => {
    expect(newCoverageWarnings([warning('BUFFER_STALE')], [])).toEqual([]);
  });
});

describe('coverageAlertMachineName', () => {
  test('prefers the label, else a short id', () => {
    expect(coverageAlertMachineName('abcdef0123456789', ' laptop ')).toBe(
      'laptop',
    );
    expect(coverageAlertMachineName('abcdef0123456789', null)).toBe(
      'machine abcdef01',
    );
    expect(coverageAlertMachineName('abcdef0123456789', '  ')).toBe(
      'machine abcdef01',
    );
  });
});

describe('coverageAlertMessage', () => {
  test('prefixes the server message with the machine', () => {
    expect(coverageAlertMessage('laptop', warning('DEAD_LETTERED'))).toBe(
      'Telemetry coverage — laptop: DEAD_LETTERED message',
    );
  });
});

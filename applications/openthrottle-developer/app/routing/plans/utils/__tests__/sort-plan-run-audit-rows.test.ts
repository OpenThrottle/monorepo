import { describe, expect, test } from 'vitest';

import { sortPlanRunAuditRows } from '../sort-plan-run-audit-rows';

interface Row {
  readonly id: string;
  readonly scheduledFor: string | null;
  readonly status: string;
}

const row = (id: string, status: string, scheduledFor: string | null): Row => ({
  id,
  scheduledFor,
  status,
});

const ids = (rows: readonly Row[]): string[] => rows.map((item) => item.id);

describe('sortPlanRunAuditRows', () => {
  test('pins pending SCHEDULED rows to the top, soonest fire time first', () => {
    // Incoming order is the server's createdAt DESC.
    const rows = [
      row('newest-completed', 'COMPLETED', null),
      row('later-scheduled', 'SCHEDULED', '2026-12-01T10:00:00.000Z'),
      row('older-completed', 'COMPLETED', null),
      row('sooner-scheduled', 'SCHEDULED', '2026-11-05T10:00:00.000Z'),
    ];

    expect(ids(sortPlanRunAuditRows(rows))).toEqual([
      'sooner-scheduled',
      'later-scheduled',
      'newest-completed',
      'older-completed',
    ]);
  });

  test('leaves MISSED and SUPERSEDED rows in their createdAt position', () => {
    const rows = [
      row('a', 'COMPLETED', null),
      row('missed', 'MISSED', '2026-11-01T10:00:00.000Z'),
      row('superseded', 'SUPERSEDED', '2026-10-31T10:00:00.000Z'),
      row('scheduled', 'SCHEDULED', '2026-11-09T10:00:00.000Z'),
    ];

    expect(ids(sortPlanRunAuditRows(rows))).toEqual([
      'scheduled',
      'a',
      'missed',
      'superseded',
    ]);
  });

  test('sorts a SCHEDULED row with no usable fire time last among the scheduled rows', () => {
    const rows = [
      row('unknown', 'SCHEDULED', null),
      row('garbage', 'SCHEDULED', 'not-a-date'),
      row('known', 'SCHEDULED', '2026-11-05T10:00:00.000Z'),
    ];

    expect(ids(sortPlanRunAuditRows(rows))).toEqual([
      'known',
      'unknown',
      'garbage',
    ]);
  });

  test('does not mutate its input', () => {
    const rows = [
      row('done', 'COMPLETED', null),
      row('scheduled', 'SCHEDULED', '2026-11-05T10:00:00.000Z'),
    ];

    sortPlanRunAuditRows(rows);

    expect(ids(rows)).toEqual(['done', 'scheduled']);
  });
});

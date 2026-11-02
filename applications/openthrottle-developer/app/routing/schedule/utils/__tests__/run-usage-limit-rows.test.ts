import { describe, expect, test } from 'vitest';

import { RUN_DETAIL_COPY } from '~/routing/schedule/data/data.run-detail';

import { runUsageLimitRows } from '../run-usage-limit-rows';

const { fields } = RUN_DETAIL_COPY;

describe('runUsageLimitRows', () => {
  test('adds the reset time for a usage_limited run', () => {
    const rows = runUsageLimitRows({
      status: 'usage_limited',
      usageLimitResetsAt: '2026-11-01T17:00:00.000Z',
    });

    expect(rows.map((row) => row.label)).toEqual([fields.usageLimitResetsAt]);
  });

  test('adds the continued run id for a resume run', () => {
    const rows = runUsageLimitRows({
      resumeOfRunId: 'run-1',
      status: 'succeeded',
    });

    expect(rows).toEqual([
      { label: fields.resumeOfRunId, mono: true, value: 'run-1' },
    ]);
  });

  test('adds nothing for an ordinary run', () => {
    expect(
      runUsageLimitRows({ resumeOfRunId: null, status: 'failed' }),
    ).toEqual([]);
  });
});

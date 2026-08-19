import { describe, expect, test } from 'vitest';
import { filterJobsBySearch } from '../filter-jobs-by-search';
import type { ScheduledJobCardFragment } from '~/__generated__/graphql';

const buildJob = (
  overrides: Partial<ScheduledJobCardFragment>,
): ScheduledJobCardFragment => ({
  cronPattern: '0 9 * * *',
  driverId: 'claude',
  enabled: true,
  id: 'job-1',
  lastRunAt: null,
  model: null,
  name: 'Nightly audit',
  nextRunAt: null,
  repositoryCheckoutId: null,
  timezone: 'UTC',
  updatedAt: '2026-08-19T00:00:00.000Z',
  ...overrides,
});

describe('filterJobsBySearch', () => {
  test('returns every job when the query is empty', () => {
    const jobs = [buildJob({ id: 'a' }), buildJob({ id: 'b' })];

    expect(filterJobsBySearch(jobs, '')).toEqual(jobs);
  });

  test('returns every job when the query is only whitespace', () => {
    const jobs = [buildJob({ id: 'a' })];

    expect(filterJobsBySearch(jobs, '   ')).toEqual(jobs);
  });

  test('matches the job name case-insensitively', () => {
    const match = buildJob({ id: 'a', name: 'Nightly Audit' });
    const other = buildJob({ id: 'b', name: 'Weekly digest' });

    expect(filterJobsBySearch([match, other], 'nightly')).toEqual([match]);
  });

  test('matches the cron pattern', () => {
    const match = buildJob({ cronPattern: '30 6 * * 1', id: 'a' });
    const other = buildJob({ cronPattern: '0 9 * * *', id: 'b' });

    expect(filterJobsBySearch([match, other], '30 6')).toEqual([match]);
  });

  test('matches the driver id', () => {
    const match = buildJob({ driverId: 'opencode', id: 'a' });
    const other = buildJob({ driverId: 'claude', id: 'b' });

    expect(filterJobsBySearch([match, other], 'OPENCODE')).toEqual([match]);
  });

  test('matches the repository display name', () => {
    const match = buildJob({
      id: 'a',
      repository: {
        displayName: 'OpenThrottle Monorepo',
        filesystemPath: '/repos/monorepo',
        id: 'repo-1',
      },
    });
    const other = buildJob({ id: 'b' });

    expect(filterJobsBySearch([match, other], 'monorepo')).toEqual([match]);
  });

  test('returns an empty list when nothing matches', () => {
    const jobs = [buildJob({ id: 'a' })];

    expect(filterJobsBySearch(jobs, 'zzz-no-match')).toEqual([]);
  });
});

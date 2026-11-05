import { describe, expect, test } from 'vitest';

import { PLAN_RUN_META_FIELDS } from '~/routing/plans/data/data.plan-run-history';

import {
  buildPlanRunMetaItems,
  isActivePlanRunStatus,
  selectHistoryRuns,
  selectLatestRun,
  selectUpcomingRuns,
} from '../plan-run-sections';

const run = (
  id: string,
  status: string,
  createdAt: string,
  scheduledFor: string | null = null,
) => {
  return { createdAt, id, scheduledFor, status };
};

const NO_PLAN_SCHEDULE = { scheduledRunAt: null, scheduledRunId: null };

describe('selectUpcomingRuns', () => {
  describe('when nothing is scheduled', () => {
    test('returns no items', () => {
      expect(
        selectUpcomingRuns(
          [run('a', 'COMPLETED', '2026-11-01T00:00:00Z')],
          NO_PLAN_SCHEDULE,
        ),
      ).toEqual([]);
    });
  });

  describe('when several runs are scheduled', () => {
    test('orders them soonest first with an unparseable time last', () => {
      const items = selectUpcomingRuns(
        [
          run(
            'later',
            'SCHEDULED',
            '2026-11-01T00:00:00Z',
            '2026-11-05T00:00:00Z',
          ),
          run('broken', 'SCHEDULED', '2026-11-01T00:00:00Z', 'not a date'),
          run(
            'soon',
            'SCHEDULED',
            '2026-11-01T00:00:00Z',
            '2026-11-04T00:00:00Z',
          ),
          run('done', 'COMPLETED', '2026-11-01T00:00:00Z'),
        ],
        NO_PLAN_SCHEDULE,
      );

      expect(items.map((item) => item.id)).toEqual(['soon', 'later', 'broken']);
      expect(items.every((item) => item.kind === 'run')).toBe(true);
    });
  });

  describe('when plan.scheduledRunId is outside the list', () => {
    test('appends a backstop item with the plan fire time', () => {
      const items = selectUpcomingRuns([], {
        scheduledRunAt: '2026-11-04T00:00:00Z',
        scheduledRunId: 'missing',
      });

      expect(items).toEqual([
        {
          id: 'missing',
          kind: 'backstop',
          scheduledFor: '2026-11-04T00:00:00Z',
        },
      ]);
    });
  });

  describe('when plan.scheduledRunId is already in the list', () => {
    test('does not duplicate it', () => {
      const items = selectUpcomingRuns(
        [
          run(
            's1',
            'SCHEDULED',
            '2026-11-01T00:00:00Z',
            '2026-11-04T00:00:00Z',
          ),
        ],
        { scheduledRunAt: '2026-11-04T00:00:00Z', scheduledRunId: 's1' },
      );

      expect(items).toHaveLength(1);
      expect(items[0]?.kind).toBe('run');
    });
  });
});

describe('selectHistoryRuns', () => {
  describe('when SCHEDULED runs are mixed in', () => {
    test('drops them and keeps MISSED and SUPERSEDED, newest first', () => {
      const rows = selectHistoryRuns([
        run('missed', 'MISSED', '2026-11-01T00:00:00Z', '2026-11-01T01:00:00Z'),
        run(
          'sched',
          'SCHEDULED',
          '2026-11-04T00:00:00Z',
          '2026-11-05T00:00:00Z',
        ),
        run('done', 'COMPLETED', '2026-11-03T00:00:00Z'),
        run('superseded', 'SUPERSEDED', '2026-11-02T00:00:00Z'),
      ]);

      expect(rows.map((row) => row.id)).toEqual([
        'done',
        'superseded',
        'missed',
      ]);
    });
  });

  describe('when createdAt is unparseable', () => {
    test('sorts that run last', () => {
      const rows = selectHistoryRuns([
        run('broken', 'COMPLETED', 'not a date'),
        run('ok', 'COMPLETED', '2026-11-01T00:00:00Z'),
      ]);

      expect(rows.map((row) => row.id)).toEqual(['ok', 'broken']);
    });
  });

  describe('when given an array', () => {
    test('does not mutate it', () => {
      const input = [
        run('old', 'COMPLETED', '2026-11-01T00:00:00Z'),
        run('new', 'COMPLETED', '2026-11-02T00:00:00Z'),
      ];

      selectHistoryRuns(input);

      expect(input.map((row) => row.id)).toEqual(['old', 'new']);
    });
  });
});

describe('selectLatestRun', () => {
  describe('when an active run exists', () => {
    test('prefers it over a newer finished run', () => {
      const latest = selectLatestRun([
        run('finished', 'COMPLETED', '2026-11-03T00:00:00Z'),
        run('active', 'IN_PROGRESS', '2026-11-02T00:00:00Z'),
      ]);

      expect(latest?.id).toBe('active');
    });
  });

  describe('when no run is active', () => {
    test('returns the newest non-SCHEDULED run', () => {
      const latest = selectLatestRun([
        run('old', 'COMPLETED', '2026-11-01T00:00:00Z'),
        run('sched', 'SCHEDULED', '2026-11-03T00:00:00Z'),
        run('new', 'USAGE_LIMITED', '2026-11-02T00:00:00Z'),
      ]);

      expect(latest?.id).toBe('new');
    });
  });

  describe('when every run is SCHEDULED', () => {
    test('returns null', () => {
      expect(
        selectLatestRun([run('sched', 'SCHEDULED', '2026-11-03T00:00:00Z')]),
      ).toBeNull();
    });
  });
});

describe('buildPlanRunMetaItems', () => {
  const snapshot = JSON.stringify({
    ralph: { effort: 'high', model: 'snapshot-model' },
    workspace: { workingDirectory: '/tmp/worktree' },
  });

  test('orders model, effort, backend, workspace and keeps only requested fields', () => {
    const items = buildPlanRunMetaItems(
      {
        executionBackend: 'claude',
        model: 'opus',
        runConfigSnapshotJson: snapshot,
      },
      [
        PLAN_RUN_META_FIELDS.workspace,
        PLAN_RUN_META_FIELDS.backend,
        PLAN_RUN_META_FIELDS.model,
      ],
    );

    expect(items.map((item) => item.field)).toEqual([
      'model',
      'backend',
      'workspace',
    ]);
    expect(items[0]?.value).toBe('opus');
  });

  test('omits what the run did not record', () => {
    expect(
      buildPlanRunMetaItems(
        { executionBackend: null, model: null, runConfigSnapshotJson: null },
        Object.values(PLAN_RUN_META_FIELDS),
      ),
    ).toEqual([]);
  });
});

describe('isActivePlanRunStatus', () => {
  test('is true only for QUEUED and IN_PROGRESS', () => {
    expect(isActivePlanRunStatus('QUEUED')).toBe(true);
    expect(isActivePlanRunStatus('IN_PROGRESS')).toBe(true);
    expect(isActivePlanRunStatus('COMPLETED')).toBe(false);
  });
});

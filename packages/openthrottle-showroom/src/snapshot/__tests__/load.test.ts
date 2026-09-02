import { describe, expect, test } from 'vitest';

import {
  applyAliases,
  assertDisjointFromHeroIds,
  coerceRunStatus,
  resolveOffset,
  uniqueViolationConstraint,
} from '../load';

const SEED_TIME = new Date('2026-08-28T12:00:00.000Z');

describe('resolveOffset', () => {
  test('resolves a millisecond offset against seed time', () => {
    expect(resolveOffset({ $offsetMs: -3_600_000 }, SEED_TIME)).toBe(
      '2026-08-28T11:00:00.000Z',
    );
  });

  test('resolves a day offset to a plain date', () => {
    expect(resolveOffset({ $offsetDays: -7 }, SEED_TIME)).toBe('2026-08-21');
  });

  test('preserves ordering: an earlier offset resolves earlier', () => {
    const earlier = resolveOffset({ $offsetMs: -7_200_000 }, SEED_TIME);
    const later = resolveOffset({ $offsetMs: -3_600_000 }, SEED_TIME);

    expect(earlier < later).toBe(true);
  });

  test('a later seed time shifts everything forward by the same amount', () => {
    const shifted = new Date(SEED_TIME.getTime() + 86_400_000);

    expect(
      Date.parse(resolveOffset({ $offsetMs: -1_000 }, shifted)) -
        Date.parse(resolveOffset({ $offsetMs: -1_000 }, SEED_TIME)),
    ).toBe(86_400_000);
  });
});

describe('assertDisjointFromHeroIds', () => {
  test('accepts imported rows with real ids', () => {
    expect(() =>
      assertDisjointFromHeroIds('plans', [
        { id: '050c43a1-8b00-485d-adce-86bda5bb7a19' },
      ]),
    ).not.toThrow();
  });

  test('refuses a snapshot that captured hero rows', () => {
    expect(() =>
      assertDisjointFromHeroIds('plan_runs', [
        { id: 'd0d0d0d0-0000-4000-8000-00000000ff01' },
      ]),
    ).toThrow(/exported from a seeded demo database/);
  });

  test('ignores tables whose primary key is not a uuid id', () => {
    expect(() =>
      assertDisjointFromHeroIds('plan_output_stream', [{ id: 42 }]),
    ).not.toThrow();
  });
});

describe('coerceRunStatus', () => {
  test.each(['CANCELED', 'COMPLETED', 'FAILED', 'STALE'])(
    'leaves terminal status %s alone',
    (status) => {
      expect(coerceRunStatus('plan_runs', { status }).status).toBe(status);
    },
  );

  test.each(['IN_PROGRESS', 'PENDING', 'QUEUED'])(
    'coerces non-terminal status %s to COMPLETED',
    (status) => {
      // A run with no live heartbeat gets swept stale by the server, which
      // reconciles its plan's badge — so take 7 would disagree with take 1.
      expect(coerceRunStatus('plan_runs', { status }).status).toBe('COMPLETED');
    },
  );

  test('does not touch other tables', () => {
    expect(coerceRunStatus('plans', { status: 'IN_PROGRESS' }).status).toBe(
      'IN_PROGRESS',
    );
  });
});

describe('uniqueViolationConstraint', () => {
  test('names the constraint a unique violation reports', () => {
    expect(
      uniqueViolationConstraint({
        code: '23505',
        constraint: 'idx_projects_nx_project_name_unique',
      }),
    ).toBe('idx_projects_nx_project_name_unique');
  });

  test('unwraps the driver error TypeORM wraps', () => {
    expect(
      uniqueViolationConstraint({
        driverError: { code: '23505', constraint: 'uq_plan_tags' },
        message: 'duplicate key value violates unique constraint',
      }),
    ).toBe('uq_plan_tags');
  });

  test('ignores any other failure, so it stays fatal', () => {
    expect(
      uniqueViolationConstraint({ code: '23503', constraint: 'fk_plans' }),
    ).toBeUndefined();
    expect(uniqueViolationConstraint(new Error('connection reset'))).toBe(
      undefined,
    );
  });
});

describe('applyAliases', () => {
  const foreignKeyParents = new Map([
    ['plans.project_id', 'projects'],
    ['tasks.plan_id', 'plans'],
  ]);
  const aliases = new Map([
    [
      'projects',
      new Map<string, unknown>([
        ['f6848476-real', 'd0d0d0d0-0000-4000-8000-0000000000a3'],
      ]),
    ],
  ]);

  test('follows a dropped parent to the row that kept its natural key', () => {
    expect(
      applyAliases(
        'plans',
        { id: 'p1', project_id: 'f6848476-real' },
        foreignKeyParents,
        aliases,
      ),
    ).toEqual({ id: 'p1', project_id: 'd0d0d0d0-0000-4000-8000-0000000000a3' });
  });

  test('leaves a row with no aliased parent untouched', () => {
    const row = { id: 'p2', project_id: 'another-project' };

    expect(applyAliases('plans', row, foreignKeyParents, aliases)).toBe(row);
  });

  test('only rewrites columns that are foreign keys into the aliased table', () => {
    // `id` happens to carry the dropped project's id, but it is not a foreign
    // key into `projects`, so it must not be rewritten.
    expect(
      applyAliases(
        'tasks',
        { id: 'f6848476-real', plan_id: 'p1' },
        foreignKeyParents,
        aliases,
      ),
    ).toEqual({ id: 'f6848476-real', plan_id: 'p1' });
  });

  test('ignores a null foreign key', () => {
    const row = { id: 'p3', project_id: null };

    expect(applyAliases('plans', row, foreignKeyParents, aliases)).toBe(row);
  });
});

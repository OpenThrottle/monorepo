import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  isSelectOnly,
  recordQueries,
} from '../../../tests/db/query-recorder.ts';
import type { ScratchDatabase } from '../../../tests/db/scratch-database.ts';
import {
  createScratchDatabase,
  isLocalPostgresReachable,
} from '../../../tests/db/scratch-database.ts';
import {
  seedSentinelFixture,
  SENTINEL,
} from '../../../tests/db/sentinel-fixture.ts';
import type { MetricQuery } from '../../types/index.ts';
import { buildEnvelope, resolveWindow } from '../envelope.ts';
import { renderMarkdownReport } from '../markdown-report.ts';
import {
  agentConversationsMetricQuery,
  planRunsMetricQuery,
  scheduledAgentJobsMetricQuery,
  workSessionsMetricQuery,
} from '../metrics/agent-runs.ts';
import {
  disabledAgentClisMetricQuery,
  favoriteModelsMetricQuery,
  modelTokenUsageMetricQuery,
} from '../metrics/models.ts';
import { plansMetricQuery, planTagsMetricQuery } from '../metrics/plans.ts';
import { runMetricQueries } from '../metrics/registry.ts';
import {
  skillUsageMetricQuery,
  skillUsageOutcomeMetricQuery,
} from '../metrics/skill-usage.ts';
import { tasksMetricQuery, taskTagsMetricQuery } from '../metrics/tasks.ts';
import { probeCapabilities, readMigrationHighWaterMark } from '../postgres.ts';

/**
 * @description Runs the full ot-telemetry pipeline (the same metric queries
 * `src/index.ts` registers) against a real, throwaway, fully-migrated Postgres
 * database — never a mocked driver, per this task's instruction. The whole
 * suite is skipped (not failed) when no local Postgres is reachable, so this
 * file degrades the same way the tool itself does on a box without a DB,
 * rather than silently reporting green with zero real coverage.
 *
 * The reachability probe runs at module-collection time (top-level `await`)
 * so `describe.runIf` sees a real boolean — gating on a variable an async
 * `beforeAll` hasn't set yet would always evaluate to its initial value.
 */

const METRIC_QUERIES: MetricQuery<unknown>[] = [
  plansMetricQuery,
  planTagsMetricQuery,
  tasksMetricQuery,
  taskTagsMetricQuery,
  skillUsageMetricQuery,
  skillUsageOutcomeMetricQuery,
  modelTokenUsageMetricQuery,
  favoriteModelsMetricQuery,
  disabledAgentClisMetricQuery,
  planRunsMetricQuery,
  workSessionsMetricQuery,
  agentConversationsMetricQuery,
  scheduledAgentJobsMetricQuery,
];

const reachable = await isLocalPostgresReachable();
if (!reachable) {
  console.warn(
    'ot-telemetry db-integration.test.ts: no local Postgres reachable — skipping the real-DB suite. ' +
      'Start Postgres in the main checkout (pnpm run database:start there, not in this worktree) and re-run to exercise it.',
  );
}

describe.runIf(reachable)('ot-telemetry against a real Postgres', () => {
  let scratch: ScratchDatabase;

  beforeAll(async () => {
    scratch = await createScratchDatabase();
    await seedSentinelFixture(scratch.pool);
  }, 120_000);

  afterAll(async () => {
    await scratch.drop();
  }, 60_000);

  it('runs every registered query without error, and every query it issues is SELECT-only', async () => {
    const recorder = recordQueries(scratch.pool);

    try {
      const probe = await probeCapabilities(scratch.pool);
      const window = resolveWindow({});

      const [migration, metricRun] = await Promise.all([
        readMigrationHighWaterMark(scratch.pool, probe),
        runMetricQueries(METRIC_QUERIES, {
          client: scratch.pool,
          probe,
          window,
        }),
      ]);

      // Every metric query was satisfiable against a freshly migrated DB.
      expect(metricRun.skipped).toEqual([]);
      expect(migration.migrationHighWaterMark).not.toBeNull();
      expect(Object.keys(metricRun.metrics).sort()).toEqual(
        METRIC_QUERIES.map((query) => query.name).sort(),
      );
    } finally {
      recorder.restore();
    }

    expect(recorder.statements.length).toBeGreaterThan(0);
    const nonSelect = recorder.statements.filter((sql) => !isSelectOnly(sql));
    expect(nonSelect).toEqual([]);
  });

  it('degrades gracefully (skips, never throws) when a required table is missing', async () => {
    // A dedicated scratch database (not the shared `scratch` one) so the
    // `DROP TABLE` here can be permanent and simple — `probeCapabilities`/
    // `runMetricQueries` take a `pg.Pool`, and a transaction-scoped
    // `PoolClient` is a different (narrower) type, so reusing the shared
    // pool under a `BEGIN`/`ROLLBACK` would require widening those
    // signatures. A second throwaway database keeps this test self-
    // contained instead.
    const broken = await createScratchDatabase();
    try {
      await broken.pool.query('DROP TABLE skill_usage_events CASCADE');

      const probe = await probeCapabilities(broken.pool);
      const window = resolveWindow({});
      const result = await runMetricQueries(METRIC_QUERIES, {
        client: broken.pool,
        probe,
        window,
      });

      expect(probe.hasTable('skill_usage_events')).toBe(false);
      const skippedNames = result.skipped.map((entry) => entry.name).sort();
      expect(skippedNames).toEqual(['skill_usage', 'skill_usage_outcomes']);
      // Every other metric still ran — one missing table skips only the
      // families that actually depend on it.
      expect(Object.keys(result.metrics)).toContain('plans');
      expect(Object.keys(result.metrics)).toContain('tasks');
    } finally {
      await broken.drop();
    }
  }, 120_000);

  it('never leaks a sentinel string planted in every free-text column into the default (aggregate) JSON or Markdown output', async () => {
    const probe = await probeCapabilities(scratch.pool);
    const window = resolveWindow({});

    const [migration, metricRun] = await Promise.all([
      readMigrationHighWaterMark(scratch.pool, probe),
      runMetricQueries(METRIC_QUERIES, {
        client: scratch.pool,
        probe,
        window,
      }),
    ]);

    const envelope = buildEnvelope({
      actorKey: null,
      metrics: metricRun.metrics,
      migrationHighWaterMark: migration.migrationHighWaterMark,
      repoSlug: null,
      skipped: [...migration.skipped, ...metricRun.skipped],
      window,
    });

    const json = JSON.stringify(envelope);
    const markdown = renderMarkdownReport(envelope);

    expect(json).not.toContain(SENTINEL);
    expect(markdown).not.toContain(SENTINEL);
  });
});

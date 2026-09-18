import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  agentConversationsMetricQuery,
  planRunsMetricQuery,
  scheduledAgentJobsMetricQuery,
  workSessionsMetricQuery,
} from '../lib/agent-run-metrics.ts';
import { probeCapabilities } from '../lib/capability-probe.ts';
import { buildEnvelope, resolveWindow } from '../lib/envelope.ts';
import { renderMarkdownReport } from '../lib/markdown-report.ts';
import type { MetricQuery } from '../lib/metric-registry.ts';
import { runMetricQueries } from '../lib/metric-registry.ts';
import { readMigrationHighWaterMark } from '../lib/migration-high-water-mark.ts';
import {
  disabledAgentClisMetricQuery,
  favoriteModelsMetricQuery,
  modelTokenUsageMetricQuery,
} from '../lib/model-metrics.ts';
import { plansMetricQuery, planTagsMetricQuery } from '../lib/plan-metrics.ts';
import {
  skillUsageMetricQuery,
  skillUsageOutcomeMetricQuery,
} from '../lib/skill-usage-metrics.ts';
import { tasksMetricQuery, taskTagsMetricQuery } from '../lib/task-metrics.ts';
import { isSelectOnly, recordQueries } from './db/query-recorder.ts';
import type { ScratchDatabase } from './db/scratch-database.ts';
import {
  createScratchDatabase,
  isLocalPostgresReachable,
} from './db/scratch-database.ts';
import { seedSentinelFixture, SENTINEL } from './db/sentinel-fixture.ts';

/**
 * @description Runs the full ot-telemetry pipeline (the same metric queries
 * `report.ts` registers) against a real, throwaway, fully-migrated Postgres
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

#!/usr/bin/env -S pnpm exec tsx

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { deriveActorKey } from './lib/actor-key.ts';
import {
  agentConversationsMetricQuery,
  planRunsMetricQuery,
  scheduledAgentJobsMetricQuery,
  workSessionsMetricQuery,
} from './lib/agent-run-metrics.ts';
import { probeCapabilities } from './lib/capability-probe.ts';
import { CliArgsError, OUTPUT_FORMATS, parseCliArgs } from './lib/cli-args.ts';
import { connectReadOnly } from './lib/connection.ts';
import { buildEnvelope, resolveWindow } from './lib/envelope.ts';
import { renderMarkdownReport } from './lib/markdown-report.ts';
import type { MetricQuery } from './lib/metric-registry.ts';
import { runMetricQueries } from './lib/metric-registry.ts';
import { readMigrationHighWaterMark } from './lib/migration-high-water-mark.ts';
import {
  disabledAgentClisMetricQuery,
  favoriteModelsMetricQuery,
  modelTokenUsageMetricQuery,
} from './lib/model-metrics.ts';
import { plansMetricQuery, planTagsMetricQuery } from './lib/plan-metrics.ts';
import { deriveRepoSlug } from './lib/repo-slug.ts';
import {
  skillUsageMetricQuery,
  skillUsageOutcomeMetricQuery,
} from './lib/skill-usage-metrics.ts';
import { tasksMetricQuery, taskTagsMetricQuery } from './lib/task-metrics.ts';

/**
 * @description ot-telemetry report CLI. Establishes the connection, capability probe, and
 * envelope; registers the plan+task, skill-usage, model+agent-run metric families (`plans`,
 * `plan_tags`, `tasks`, `task_tags`, `skill_usage`, `skill_usage_outcomes`,
 * `model_token_usage`, `favorite_models`, `disabled_agent_clis`, `plan_runs`, `work_sessions`,
 * `agent_conversations`, `scheduled_agent_jobs`); and renders `report.json` / `report.md` to
 * `--out` (default: a scratch directory under the OS temp dir, never inside this repo). See
 * `lib/cli-args.ts` for the full `--since`/`--until`/`--out`/`--detail`/`--format` flag surface.
 * Run with `pnpm exec tsx skills/ot-telemetry/scripts/report.ts [flags]`.
 */

const metricQueries: MetricQuery<unknown>[] = [
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

async function main(): Promise<void> {
  const cli = parseCliArgs();
  const window = resolveWindow({ since: cli.since, until: cli.until });

  const connection = await connectReadOnly();

  try {
    const probe = await probeCapabilities(connection.client);

    const [migration, metricRun] = await Promise.all([
      readMigrationHighWaterMark(connection.client, probe),
      runMetricQueries(metricQueries, {
        client: connection.client,
        probe,
        window,
      }),
    ]);

    const envelope = buildEnvelope({
      actorKey: deriveActorKey(),
      detailLevel: cli.detailLevel,
      metrics: metricRun.metrics,
      migrationHighWaterMark: migration.migrationHighWaterMark,
      repoSlug: deriveRepoSlug(),
      skipped: [...migration.skipped, ...metricRun.skipped],
      window,
    });

    await mkdir(cli.outDir, { recursive: true });

    const writes: Promise<void>[] = [];
    if (
      cli.format === OUTPUT_FORMATS.BOTH ||
      cli.format === OUTPUT_FORMATS.JSON
    ) {
      writes.push(
        writeFile(
          join(cli.outDir, 'report.json'),
          `${JSON.stringify(envelope, null, 2)}\n`,
          'utf-8',
        ),
      );
    }
    if (
      cli.format === OUTPUT_FORMATS.BOTH ||
      cli.format === OUTPUT_FORMATS.MD
    ) {
      writes.push(
        writeFile(
          join(cli.outDir, 'report.md'),
          renderMarkdownReport(envelope),
          'utf-8',
        ),
      );
    }
    await Promise.all(writes);

    console.error(`ot-telemetry: wrote report(s) to ${cli.outDir}`);
    console.error(
      'ot-telemetry: nothing was uploaded — this is a local-only read.',
    );
  } finally {
    await connection.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof CliArgsError) {
    console.error(`ot-telemetry: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

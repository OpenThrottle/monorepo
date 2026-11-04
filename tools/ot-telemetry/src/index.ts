#!/usr/bin/env -S pnpm exec tsx

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { OUTPUT_FORMATS, REPORT_FILE_NAMES } from './config/index.ts';
import { RUN_COMPLETE_COPY } from './data/data.copy.ts';
import type { MetricQuery } from './types/index.ts';
import { CliArgsError, parseCliArgs } from './utils/cli-args.ts';
import { buildEnvelope, resolveWindow } from './utils/envelope.ts';
import { deriveActorKey, deriveRepoSlug } from './utils/git.ts';
import { renderMarkdownReport } from './utils/markdown-report.ts';
import {
  agentConversationsMetricQuery,
  planRunsMetricQuery,
  scheduledAgentJobsMetricQuery,
  workSessionsMetricQuery,
} from './utils/metrics/agent-runs.ts';
import {
  disabledAgentClisMetricQuery,
  favoriteModelsMetricQuery,
  modelTokenUsageMetricQuery,
} from './utils/metrics/models.ts';
import {
  plansMetricQuery,
  planTagsMetricQuery,
} from './utils/metrics/plans.ts';
import { runMetricQueries } from './utils/metrics/registry.ts';
import {
  skillUsageMetricQuery,
  skillUsageOutcomeMetricQuery,
} from './utils/metrics/skill-usage.ts';
import {
  tasksMetricQuery,
  taskTagsMetricQuery,
} from './utils/metrics/tasks.ts';
import {
  connectReadOnly,
  probeCapabilities,
  readMigrationHighWaterMark,
} from './utils/postgres.ts';

/**
 * @description ot-telemetry report CLI. Establishes the connection, capability probe, and
 * envelope; registers the plan+task, skill-usage, model+agent-run metric families (`plans`,
 * `plan_tags`, `tasks`, `task_tags`, `skill_usage`, `skill_usage_outcomes`,
 * `model_token_usage`, `favorite_models`, `disabled_agent_clis`, `plan_runs`, `work_sessions`,
 * `agent_conversations`, `scheduled_agent_jobs`); and renders `report.json` / `report.md` to
 * `--out` (default: a scratch directory under the OS temp dir, never inside this repo). See
 * `utils/cli-args.ts` for the full `--since`/`--until`/`--out`/`--detail`/`--format` flag surface.
 * Run with `pnpm nx run @tools/ot-telemetry:report -- [flags]`.
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
          join(cli.outDir, REPORT_FILE_NAMES.JSON),
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
          join(cli.outDir, REPORT_FILE_NAMES.MD),
          renderMarkdownReport(envelope),
          'utf-8',
        ),
      );
    }
    await Promise.all(writes);

    console.error(RUN_COMPLETE_COPY.wrote(cli.outDir));
    console.error(RUN_COMPLETE_COPY.nothingUploaded);
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

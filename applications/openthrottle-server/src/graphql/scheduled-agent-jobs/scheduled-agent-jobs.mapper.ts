/**
 * @description Maps repositories entities to GraphQL ObjectTypes. `settings` is serialized to a JSON
 * string (repo convention — no GraphQLJSON scalar); it never contains an apiKey (rejected on write).
 */

import type {
  ScheduledAgentJob,
  ScheduledAgentJobRun,
  ScheduledAgentJobRunStatusCount,
} from '@openthrottle/nestjs-repositories';
import type { ScheduledAgentJobRunStatsObject } from './scheduled-agent-job-run-stats.object';
import type {
  ScheduledAgentJobObject,
  ScheduledAgentJobRunObject,
} from './scheduled-agent-job.object';

export const toScheduledAgentJobObject = (
  job: ScheduledAgentJob,
): ScheduledAgentJobObject => ({
  createdAt: job.createdAt,
  cronPattern: job.cronPattern,
  cwd: job.cwd,
  driverId: job.driverId,
  enabled: job.enabled,
  id: job.id,
  lastRunAt: job.lastRunAt,
  model: job.model,
  name: job.name,
  nextRunAt: job.nextRunAt,
  ownerUserId: job.ownerUserId,
  prompt: job.prompt,
  repositoryCheckoutId: job.repositoryCheckoutId,
  settingsJson: JSON.stringify(job.settings ?? {}),
  timeoutMs: job.timeoutMs,
  timezone: job.timezone,
  updatedAt: job.updatedAt,
});

export const toScheduledAgentJobRunObject = (
  run: ScheduledAgentJobRun,
): ScheduledAgentJobRunObject => ({
  bullmqJobId: run.bullmqJobId,
  cacheReadTokens: run.cacheReadTokens,
  cacheWriteTokens: run.cacheWriteTokens,
  cancelRequestedAt: run.cancelRequestedAt,
  costUsd: run.costUsd,
  createdAt: run.createdAt,
  driverId: run.driverId,
  errorMessage: run.errorMessage,
  exitCode: run.exitCode,
  finishedAt: run.finishedAt,
  id: run.id,
  inputTokens: run.inputTokens,
  model: run.model,
  outputTokens: run.outputTokens,
  reasoningTokens: run.reasoningTokens,
  repositoryCheckoutId: run.repositoryCheckoutId,
  resolvedCwd: run.resolvedCwd,
  scheduledAgentJobId: run.scheduledAgentJobId,
  // jsonb → JSON string (repo convention); null stays null for legacy/pre-snapshot runs.
  settingsSnapshotJson:
    run.settingsSnapshot === null ? null : JSON.stringify(run.settingsSnapshot),
  startedAt: run.startedAt,
  status: run.status,
  totalTokens: run.totalTokens,
  trigger: run.trigger,
});

/**
 * @description Folds grouped status counts into the aggregate stats object.
 *
 * Two inputs, because the two halves cover different spans: `windowCounts` is the terminal-outcome
 * picture since `since`, while `inFlightCounts` is unwindowed — a run queued days ago and still stuck
 * is exactly what the caller needs to see, so it must not be cut off by the window.
 *
 * `no_op` keeps its own count and is never folded into failures: it is terminal but not an error.
 */
export const toScheduledAgentJobRunStatsObject = (
  windowCounts: ScheduledAgentJobRunStatusCount[],
  inFlightCounts: ScheduledAgentJobRunStatusCount[],
  since: Date,
): ScheduledAgentJobRunStatsObject => {
  const countIn = (
    rows: ScheduledAgentJobRunStatusCount[],
    status: string,
  ): number => rows.find((row) => row.status === status)?.count ?? 0;

  const queuedCount = countIn(inFlightCounts, 'queued');
  const runningCount = countIn(inFlightCounts, 'running');

  return {
    cancelledCount: countIn(windowCounts, 'cancelled'),
    failedCount: countIn(windowCounts, 'failed'),
    inFlightCount: queuedCount + runningCount,
    noOpCount: countIn(windowCounts, 'no_op'),
    queuedCount,
    runningCount,
    since,
    succeededCount: countIn(windowCounts, 'succeeded'),
    windowTotalCount: windowCounts.reduce((total, row) => total + row.count, 0),
  };
};

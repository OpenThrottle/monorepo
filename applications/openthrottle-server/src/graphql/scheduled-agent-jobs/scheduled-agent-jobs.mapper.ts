/**
 * @description Maps repositories entities to GraphQL ObjectTypes. `settings` is serialized to a JSON
 * string (repo convention — no GraphQLJSON scalar); it never contains an apiKey (rejected on write).
 */

import type {
  ScheduledAgentJob,
  ScheduledAgentJobRun,
} from '@openthrottle/nestjs-repositories';
import {
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
  scheduledAgentJobId: run.scheduledAgentJobId,
  // jsonb → JSON string (repo convention); null stays null for legacy/pre-snapshot runs.
  settingsSnapshotJson:
    run.settingsSnapshot === null ? null : JSON.stringify(run.settingsSnapshot),
  startedAt: run.startedAt,
  status: run.status,
  totalTokens: run.totalTokens,
  trigger: run.trigger,
});

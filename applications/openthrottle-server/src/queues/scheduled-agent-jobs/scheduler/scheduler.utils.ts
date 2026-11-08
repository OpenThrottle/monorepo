import { type ScheduledAgentJob } from '@openthrottle/nestjs-repositories';

import type { ScheduledAgentJobPayload } from '../scheduled-agent-jobs.types.ts';
/**
 * @description Builds the self-contained run snapshot embedded in the BullMQ scheduler (and re-used
 * by run-now), so the processor executes without a DB read. No `runId` — a scheduled fire creates its
 * own run row.
 *
 * `resolvedCheckoutPath` is the schedule's targeted checkout resolved to a directory at snapshot
 * time; it becomes the payload's `cwd` so a payload stays independently runnable. The checkout id
 * travels alongside it so the processor can re-resolve rather than trust a stale path.
 */
export const buildScheduledAgentJobPayload = (
  job: ScheduledAgentJob,
  resolvedCheckoutPath?: string | null,
): ScheduledAgentJobPayload => {
  return {
    cwd: resolvedCheckoutPath ?? job.cwd,
    driverId: job.driverId,
    model: job.model,
    prompt: job.prompt,
    repositoryCheckoutId: job.repositoryCheckoutId,
    scheduleId: job.id,
    settings: job.settings,
    timeoutMs: job.timeoutMs,
  };
};

import type { Job } from 'bullmq';
import type {
  ScheduledAgentJobDriverId,
  ScheduledAgentJobSettings,
} from '@openthrottle/nestjs-repositories';

/**
 * @description Self-contained payload for one scheduled-agent-job run: a snapshot taken at
 * schedule-registration (or run-now) time, so the processor executes without a DB read.
 * `runId` is present for run-now (the enqueuer pre-created the run row); absent for a scheduled
 * fire (the processor creates the run row and stamps `bullmq_job_id`).
 */
export interface ScheduledAgentJobPayload {
  /**
   * Best-known directory at snapshot time: the resolved checkout path when the schedule targets one,
   * else the legacy explicit `cwd`. The processor treats this as a FALLBACK — see
   * `repositoryCheckoutId`.
   */
  readonly cwd?: string | null;
  readonly driverId: ScheduledAgentJobDriverId;
  readonly model?: string | null;
  readonly prompt: string;
  /**
   * The checkout the schedule targeted at snapshot time. Optional, so scheduler payloads already
   * sitting in Redis from before repository targeting still decode. When present the processor
   * re-resolves it per run rather than trusting `cwd`, which can be months stale.
   */
  readonly repositoryCheckoutId?: string | null;
  readonly runId?: string | null;
  readonly scheduleId: string;
  readonly settings?: ScheduledAgentJobSettings;
  readonly timeoutMs?: number | null;
}

export type ScheduledAgentJobBullJob = Job<ScheduledAgentJobPayload, void>;

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
  readonly cwd?: string | null;
  readonly driverId: ScheduledAgentJobDriverId;
  readonly model?: string | null;
  readonly prompt: string;
  readonly runId?: string | null;
  readonly scheduleId: string;
  readonly settings?: ScheduledAgentJobSettings;
  readonly timeoutMs?: number | null;
}

export type ScheduledAgentJobBullJob = Job<ScheduledAgentJobPayload, void>;

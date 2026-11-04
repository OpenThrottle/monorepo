import type {
  ScheduledAgentJobDriverId,
  ScheduledAgentJobSettings,
} from '@openthrottle/nestjs-repositories';
import type { Job } from 'bullmq';

/**
 * @description Self-contained payload for one scheduled-agent-job run: a snapshot taken at
 * schedule-registration (or run-now) time, so the processor executes without a DB read.
 * `runId` is present for run-now (the enqueuer pre-created the run row); absent for a scheduled
 * fire (the processor creates the run row and stamps `bullmq_job_id`).
 */
export interface ScheduledAgentJobPayload {
  /**
   * Set only on the explicit catch-up the boot reconcile enqueues under the misfire policy: the cron
   * slot (epoch ms) it runs for. The reconcile already applied the policy, so the processor runs it
   * without re-gating. A scheduler fire leaves this unset; its slot is read from the job id.
   */
  readonly catchUpForSlotMs?: number | null;
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
  /**
   * Set only on an interval or once fire (a single delayed job, not a BullMQ scheduler job): the slot
   * (epoch ms) it fires for. Never misfire-gated: a late interval or once fire runs once, late.
   */
  readonly slotMs?: number | null;
  readonly timeoutMs?: number | null;
}

export type ScheduledAgentJobBullJob = Job<ScheduledAgentJobPayload, void>;

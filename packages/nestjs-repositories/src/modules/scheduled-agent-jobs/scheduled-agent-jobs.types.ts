import type {
  ScheduledAgentJobDriverId,
  ScheduledAgentJobMisfirePolicy,
  ScheduledAgentJobScheduleKind,
  ScheduledAgentJobSettings,
} from './scheduled-agent-job.entity.ts';
import type {
  ScheduledAgentJobRunSettingsSnapshot,
  ScheduledAgentJobRunStatus,
  ScheduledAgentJobRunTrigger,
} from './scheduled-agent-job-run.entity.ts';

/** Fields a caller supplies to create a schedule; `schedulerKey` is derived from the new id. */
export interface CreateScheduledAgentJobInput {
  /** Required for a `cron` schedule (the DB CHECK enforces it); null for interval and once. */
  readonly cronPattern: string | null;
  readonly cwd?: string | null;
  readonly driverId: ScheduledAgentJobDriverId;
  readonly enabled?: boolean;
  /** Required for an `interval` schedule; null otherwise. */
  readonly intervalMs?: number | null;
  /** Omitted keeps the column default (`skip`). */
  readonly misfirePolicy?: ScheduledAgentJobMisfirePolicy;
  /** Omitted keeps the column default (10 minutes). */
  readonly misfireThresholdMs?: number;
  readonly model?: string | null;
  readonly name: string;
  readonly ownerUserId?: string | null;
  readonly prompt: string;
  readonly repositoryCheckoutId?: string | null;
  /** Required for a `once` schedule; null otherwise. */
  readonly runAt?: Date | null;
  /** Omitted keeps the column default (`cron`). */
  readonly scheduleKind?: ScheduledAgentJobScheduleKind;
  readonly settings?: ScheduledAgentJobSettings;
  readonly timeoutMs?: number | null;
  readonly timezone?: string | null;
}

/** Mutable fields of a schedule; omitted fields are left unchanged. */
export type UpdateScheduledAgentJobInput = Partial<
  Omit<CreateScheduledAgentJobInput, 'ownerUserId'>
>;

/** Fields to open a run row (status defaults to queued). */
export interface CreateScheduledAgentJobRunInput {
  readonly bullmqJobId?: string | null;
  readonly driverId: ScheduledAgentJobDriverId;
  readonly model?: string | null;
  readonly repositoryCheckoutId?: string | null;
  readonly resolvedCwd?: string | null;
  /** The usage_limited run this run continues (trigger `resume`); omitted for every other run. */
  readonly resumeOfRunId?: string | null;
  readonly scheduledAgentJobId: string;
  /** The cron slot a `schedule`-trigger run belongs to; omitted for manual/resume runs. */
  readonly scheduledFor?: Date | null;
  readonly settingsSnapshot?: ScheduledAgentJobRunSettingsSnapshot | null;
  readonly status?: ScheduledAgentJobRunStatus;
  readonly trigger: ScheduledAgentJobRunTrigger;
}

/**
 * Fields to open the run row for one cron slot; the trigger is always `schedule`. No settings
 * snapshot: the claim is a raw `INSERT ... ON CONFLICT`, and the jsonb snapshot is written through
 * {@link ScheduledAgentJobsService.markRunStarted} once the slot is won.
 */
export interface ClaimScheduledAgentJobSlotInput extends Omit<
  CreateScheduledAgentJobRunInput,
  'scheduledFor' | 'settingsSnapshot' | 'trigger'
> {
  readonly scheduledFor: Date;
}

/** Cron slots of one schedule to record as `missed` runs (the misfire policy did not run them). */
export interface RecordMissedScheduledAgentJobRunsInput {
  readonly driverId: ScheduledAgentJobDriverId;
  readonly errorMessage: string;
  readonly model: string | null;
  readonly scheduledAgentJobId: string;
  readonly slots: readonly Date[];
}

/**
 * Fields backfilled onto a run when the processor claims it. Every field is optional: a field left
 * undefined is not written, so a pre-created run-now row keeps whatever it was opened with.
 */
export interface StartScheduledAgentJobRunInput {
  readonly repositoryCheckoutId?: string | null;
  readonly resolvedCwd?: string | null;
  readonly settingsSnapshot?: ScheduledAgentJobRunSettingsSnapshot | null;
}

/**
 * Terminal state of a run: status + optional exit/error, stamped with finishedAt.
 * The token/cost/rawUsage fields are optional so pre-usage callers (crash safety net,
 * catch path) still compile; when omitted the run's usage columns stay null.
 */
export interface FinishScheduledAgentJobRunInput {
  readonly cacheReadTokens?: number | null;
  readonly cacheWriteTokens?: number | null;
  readonly costUsd?: number | null;
  readonly errorMessage?: string | null;
  readonly exitCode?: number | null;
  readonly inputTokens?: number | null;
  readonly outputTokens?: number | null;
  readonly rawUsage?: Record<string, unknown> | null;
  readonly reasoningTokens?: number | null;
  readonly status: ScheduledAgentJobRunStatus;
  readonly totalTokens?: number | null;
  /** The usage limit that stopped the run (status `usage_limited`); omitted otherwise. */
  readonly usageLimitResetsAt?: Date | null;
  readonly usageLimitType?: string | null;
}

/** One grouped row of `COUNT(*) ... GROUP BY status` over the run history. */
export interface ScheduledAgentJobRunStatusCount {
  readonly count: number;
  readonly status: ScheduledAgentJobRunStatus;
}

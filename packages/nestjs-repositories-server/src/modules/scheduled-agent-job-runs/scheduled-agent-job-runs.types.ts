/**
 * @description Types for the scheduled_agent_job_runs module.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { ScheduledAgentJobDriverId } from '../scheduled-agent-jobs/scheduled-agent-jobs.types.ts';
import type { ScheduledAgentJobRun } from './scheduled-agent-job-run.entity.ts';
import type { ScheduledAgentJobRunsRepository } from './scheduled-agent-job-runs.repository.ts';

/**
 * queued (pre-created by run-now, or a delayed usage-limit resume) -> running (claimed) ->
 * succeeded | no_op | failed | cancelled | usage_limited.
 *
 * `no_op` means the process ran and exited cleanly but the agent reported it did NOT do the work —
 * it is terminal and is NOT an error. `usage_limited` means the agent CLI reported a Claude
 * subscription usage limit — it is terminal for the row and is NOT an error; a continuation run may
 * have been enqueued (see `resumeOfRunId`). `failed` stays reserved for a non-zero exit, timeout, or
 * spawn failure. `missed` is created terminal: a cron fire the job's misfire policy did not run, so
 * no agent was spawned (see `scheduledFor`). See databases/openthrottle/migrations/095, 139 and 141.
 * @public
 */
export type ScheduledAgentJobRunStatus =
  | 'cancelled'
  | 'failed'
  | 'missed'
  | 'no_op'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'usage_limited';

/**
 * @description schedule = cron fire; manual = run-now; resume = delayed continuation of a
 * usage_limited run.
 * @public
 */
export type ScheduledAgentJobRunTrigger = 'manual' | 'resume' | 'schedule';

/**
 * Effective run settings captured on the run row at execution time, so later edits
 * to the parent schedule don't rewrite this run's history. A denormalized snapshot
 * of the driver/model/reasoning-tier/permission-mode/run-config in force at fire time.
 * @public
 */
export interface ScheduledAgentJobRunSettingsSnapshot {
  readonly [key: string]: unknown;
}

/**
 * @description Scalar/column fields of {@link ScheduledAgentJobRun} surfaced to the API.
 * @public
 */
export type ScheduledAgentJobRunData = Pick<
  ScheduledAgentJobRun,
  | 'bullmqJobId'
  | 'cacheReadTokens'
  | 'cacheWriteTokens'
  | 'cancelRequestedAt'
  | 'costUsd'
  | 'createdAt'
  | 'driverId'
  | 'errorMessage'
  | 'exitCode'
  | 'finishedAt'
  | 'id'
  | 'inputTokens'
  | 'model'
  | 'outputTokens'
  | 'rawUsage'
  | 'reasoningTokens'
  | 'repositoryCheckoutId'
  | 'resolvedCwd'
  | 'resumeOfRunId'
  | 'scheduledAgentJobId'
  | 'scheduledFor'
  | 'settingsSnapshot'
  | 'startedAt'
  | 'status'
  | 'totalTokens'
  | 'trigger'
  | 'usageLimitResetsAt'
  | 'usageLimitType'
>;

/**
 * @description Fields to open a run row (status defaults to queued).
 * @public
 */
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
 * {@link ScheduledAgentJobRunsRepository.markRunStarted} once the slot is won.
 * @public
 */
export interface ClaimScheduledAgentJobSlotInput extends Omit<
  CreateScheduledAgentJobRunInput,
  'scheduledFor' | 'settingsSnapshot' | 'trigger'
> {
  readonly scheduledFor: Date;
}

/**
 * @description Cron slots of one schedule to record as `missed` runs (the misfire policy did not
 * run them).
 * @public
 */
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
 * @public
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
 * @public
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

/**
 * @description One grouped row of `COUNT(*) ... GROUP BY status` over the run history.
 * @public
 */
export interface ScheduledAgentJobRunStatusCount {
  readonly count: number;
  readonly status: ScheduledAgentJobRunStatus;
}

/**
 * @description Input for {@link ScheduledAgentJobRunsRepository.hasLiveScheduledRun}.
 * @public
 */
export interface HasLiveScheduledAgentJobRunInput {
  readonly createdSince: Date;
  readonly excludeRunId: string | null;
  readonly scheduledAgentJobId: string;
}

/**
 * @description The custom (non-`BaseRepository`) methods of
 * {@link ScheduledAgentJobRunsRepository}.
 * @public
 */
export type ScheduledAgentJobRunsRepositoryMethod =
  | 'claimScheduledSlot'
  | 'countInFlightRunsByStatus'
  | 'countRunsByStatusSince'
  | 'countUsageLimitedInChain'
  | 'createRun'
  | 'findLatestScheduledFor'
  | 'findRunById'
  | 'findRunResumingFrom'
  | 'hasLateRunSince'
  | 'hasLiveScheduledRun'
  | 'hasRunForSlot'
  | 'listInFlightRuns'
  | 'listRunsForJob'
  | 'markRunFinished'
  | 'markRunStarted'
  | 'recordMissedRuns'
  | 'requestRunCancel'
  | 'updateRunErrorMessage';

/**
 * @description One `Mock` per {@link ScheduledAgentJobRunsRepositoryMethod}, typed with the real
 * signature.
 * @public
 */
export type ScheduledAgentJobRunsRepositoryMethodMocks = {
  readonly [TMethod in ScheduledAgentJobRunsRepositoryMethod]: Mock<
    ScheduledAgentJobRunsRepository[TMethod]
  >;
};

/**
 * @description A {@link ScheduledAgentJobRunsRepository} mock: every inherited `BaseRepository`
 * method plus one `Mock` per scheduled-agent-job-runs method.
 * @public
 */
export interface ScheduledAgentJobRunsRepositoryMock
  extends
    BaseRepositoryMock<
      ScheduledAgentJobRun,
      CreateModelInput<ScheduledAgentJobRun>
    >,
    ScheduledAgentJobRunsRepositoryMethodMocks {}

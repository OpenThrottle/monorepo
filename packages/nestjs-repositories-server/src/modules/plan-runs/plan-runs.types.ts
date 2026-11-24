/**
 * @description Types for the plan_runs module.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { PlanRunConfigSnapshot } from '@openthrottle/openthrottle-plan-config';
import type { Mock } from 'vitest';

import type { PlanRun } from './plan-run.entity.ts';
import type { PLAN_RUN_STATUS } from './plan-runs.constants.ts';
import type { PlanRunsRepository } from './plan-runs.repository.ts';

/** @public */
export type PlanRunKind = 'orchestrator' | 'spawn';

/**
 * @description Supported agent-CLI backends for a plan run. Kept in lockstep with the
 * `openthrottle-drivers` `DRIVER_IDS` set and the `plan_runs_driver_check`
 * constraint (see databases/openthrottle/migrations/156). Declared as a standalone union so the
 * repositories layer stays decoupled from the CLI-invocation package.
 * @public
 */
export type PlanRunDriver =
  'antigravity' | 'claude' | 'codex' | 'cursor' | 'grok' | 'opencode';

/** @public */
export type PlanRunStatus =
  (typeof PLAN_RUN_STATUS)[keyof typeof PLAN_RUN_STATUS];

/**
 * @description Scalar/column fields of {@link PlanRun} (no relations) surfaced to the API.
 * @public
 */
export type PlanRunData = Pick<
  PlanRun,
  | 'bullmqJobId'
  | 'cancelRequestedAt'
  | 'createdAt'
  | 'driver'
  | 'heartbeatExpected'
  | 'hostname'
  | 'id'
  | 'lastHeartbeatAt'
  | 'pid'
  | 'planId'
  | 'queueName'
  | 'runKind'
  | 'scheduledFor'
  | 'settledReason'
  | 'status'
  | 'updatedAt'
  | 'workerId'
>;

/**
 * @description A SCHEDULED run that was just cancelled: its id, and the delayed BullMQ job the caller
 * should remove (null when the row never recorded one).
 * @public
 */
export interface ScheduledRunRef {
  readonly bullmqJobId: string | null;
  readonly id: string;
}

/**
 * @description A plan's soonest SCHEDULED run: which row it is and the instant it fires.
 * @public
 */
export interface ScheduledPlanRun {
  readonly id: string;
  readonly scheduledFor: Date;
}

/**
 * @description Input for {@link PlanRunsRepository.recordQueuedRun}.
 * @public
 */
export interface RecordQueuedPlanRunInput {
  /** User who enqueued the run (auth sub for a user principal); null for service-account/system. */
  readonly actorUserId?: string | null;
  /** Git branch the run operates on, captured at kickoff. Null until the required-input path supplies it. */
  readonly branch?: string | null;
  readonly bullmqJobId: string;
  /** Worktree/checkout the run runs in (repository_checkouts.id); the durable on-disk home for deep-links. */
  readonly checkoutId?: string | null;
  readonly driver: PlanRunDriver;
  /** Resolved agent model id (queryable projection of run_config_snapshot.run.model). */
  readonly model?: string | null;
  readonly planId: string;
  readonly queueName: string;
  /** The usage-limited run this run continues (migration 138); omit/null for an ordinary run. */
  readonly resumeOfRunId?: string | null;
  readonly runConfigSnapshot?: PlanRunConfigSnapshot | null;
  readonly runKind: PlanRunKind;
  /** The UTC instant a SCHEDULED run fires at (migration 140); omit/null for a run enqueued to run now. */
  readonly scheduledFor?: Date | null;
  /** Initial status; defaults to QUEUED. SCHEDULED for a run created by schedulePlanRun. */
  readonly status?: PlanRunStatus;
}

/**
 * @description The usage limit that stopped a run, as persisted on its row by
 * {@link PlanRunsRepository.settleRunUsageLimited}.
 * @public
 */
export interface UsageLimitSettleInput {
  /** Reset instant; null when the agent CLI did not report one. */
  readonly resetsAt: Date | null;
  /** Raw window name (`five_hour`, `seven_day`, …); null when not reported. */
  readonly type: string | null;
}

/**
 * @description Input for a detached plan run row. The run carries no BullMQ job
 * and drives its own iteration loop, so the row is inserted with a null bullmqJobId and runKind
 * 'orchestrator'.
 * @public
 */
export interface RegisterCliPlanRunInput {
  /** User who started the CLI run (auth sub for a user principal); null for service-account/system. */
  readonly actorUserId?: string | null;
  /**
   * OPTIONAL git branch the CLI run operates on. Omit/null → store null; non-empty
   * strings are stored verbatim (no trim/reject — enqueue remains the REQUIRED boundary).
   */
  readonly branch?: string | null;
  readonly driver: PlanRunDriver;
  /**
   * Whether this run's owner bumps its heartbeat on a timer. Defaults to true so
   * a detached run that does bump it (on a ~15s timer) is untouched;
   * an owner with no timer — an interactive /ot-loop agent turn — passes false to
   * opt out of every heartbeat-based liveness judgement (migration 110).
   */
  readonly heartbeatExpected?: boolean;
  readonly hostname: string | null;
  /** Resolved agent model id for this run; null when the caller cannot determine one. */
  readonly model?: string | null;
  readonly pid: number | null;
  readonly planId: string;
  readonly workerId: string | null;
}

/**
 * @description Where a run is executing; stamped at job start, cleared at finish.
 * @public
 */
export interface RunLocation {
  readonly bullmqJobId: string;
  readonly hostname: string | null;
  readonly pid: number | null;
  readonly queueName: string;
  readonly workerId: string | null;
}

/**
 * @description The durable cancel-request marker for a plan's live run.
 * @public
 */
export interface CancelMarker {
  readonly cancelRequestedAt: Date;
  readonly cancelRequestedBy: string | null;
}

/**
 * @description The patch {@link PlanRunsRepository.setCheckoutAndBranch} applies.
 * @public
 */
export interface PlanRunCheckoutAndBranch {
  readonly branch: string | null | undefined;
  readonly checkoutId: string;
}

/**
 * @description The workspace {@link PlanRunsRepository.setRunConfigSnapshotWorkspace} writes into
 * `run_config_snapshot.workspace`.
 * @public
 */
export interface PlanRunSnapshotWorkspace {
  readonly checkoutId?: string | null;
  readonly workingDirectory: string;
}

/**
 * @description Input for {@link PlanRunsRepository.findEndedRunsWithoutPullRequest}.
 * @public
 */
export interface FindEndedRunsWithoutPullRequestParams {
  readonly limit: number;
  readonly statuses: readonly PlanRunStatus[];
  readonly updatedSince: Date;
}

/**
 * @description How an unsupervised run's pull request ended.
 * @public
 */
export type PlanRunPullRequestOutcome = 'closed' | 'merged';

/**
 * @description The custom (non-`BaseRepository`) methods of {@link PlanRunsRepository}.
 * @public
 */
export type PlanRunsRepositoryMethod =
  | 'cancelScheduledRunsForPlan'
  | 'clearRunLocation'
  | 'countUsageLimitedInChain'
  | 'findByQueueNameAndBullmqJobId'
  | 'findEarliestScheduledForByPlanIds'
  | 'findEndedRunsWithoutPullRequest'
  | 'findLiveRunsByCheckoutIds'
  | 'findPlanIdsWithLiveDetachedRun'
  | 'findRecentByPlanId'
  | 'findRunById'
  | 'findRunHistoryByPlanId'
  | 'findScheduledByPlanId'
  | 'findScheduledRunsWithJob'
  | 'findStaleInProgressRuns'
  | 'findStaleUnsupervisedRuns'
  | 'findUnsettledRunsByCheckoutIds'
  | 'forceSettleUnsupervisedRun'
  | 'hasActiveRun'
  | 'hasUnsettledRun'
  | 'markRunStarted'
  | 'readCancelRequested'
  | 'recordHeartbeatById'
  | 'recordHeartbeatByJob'
  | 'recordQueuedRun'
  | 'registerCliRun'
  | 'rescheduleScheduledRun'
  | 'setCheckoutAndBranch'
  | 'setCheckoutIdIfNull'
  | 'setRunConfigSnapshotWorkspace'
  | 'settleCliRun'
  | 'settleQueuedRunsCancelledByJobIds'
  | 'settleRunByJob'
  | 'settleRunUsageLimited'
  | 'settleScheduledRunCancelled'
  | 'settleScheduledRunsCancelled'
  | 'settleStaleRun'
  | 'settleSupersededUnsupervisedRuns'
  | 'settleUnsettledRunByJob'
  | 'settleUnsupervisedRunForPullRequest'
  | 'stampCancelRequested'
  | 'transitionScheduledRun';

/**
 * @description One `Mock` per {@link PlanRunsRepositoryMethod}, typed with the real signature.
 * @public
 */
export type PlanRunsRepositoryMethodMocks = {
  readonly [TMethod in PlanRunsRepositoryMethod]: Mock<
    PlanRunsRepository[TMethod]
  >;
};

/**
 * @description A {@link PlanRunsRepository} mock: every inherited `BaseRepository` method plus
 * one `Mock` per plan-runs method.
 * @public
 */
export interface PlanRunsRepositoryMock
  extends
    BaseRepositoryMock<PlanRun, CreateModelInput<PlanRun>>,
    PlanRunsRepositoryMethodMocks {}

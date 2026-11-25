/**
 * @description Types for the scheduled_agent_jobs module.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { ScheduledAgentJob } from './scheduled-agent-job.entity.ts';
import type {
  SCHEDULED_AGENT_JOB_APPROVAL_STATES,
  SCHEDULED_AGENT_JOB_CREATED_VIA,
  SCHEDULED_AGENT_JOB_MISFIRE_POLICIES,
  SCHEDULED_AGENT_JOB_SCHEDULE_KINDS,
} from './scheduled-agent-jobs.constants.ts';
import type { ScheduledAgentJobsRepository } from './scheduled-agent-jobs.repository.ts';

/**
 * Agent-CLI driver id for a scheduled job. Kept in lockstep with the `openthrottle-drivers`
 * `DRIVER_IDS` set but declared standalone so the repositories layer stays decoupled from the
 * CLI-invocation package (same pattern as `PlanRunDriver`). Stored as text and validated
 * app-side via `parseDriverId`, not CHECK-constrained, because the driver set grows.
 * @public
 */
export type ScheduledAgentJobDriverId =
  'antigravity' | 'claude' | 'codex' | 'cursor' | 'grok' | 'opencode';

/**
 * @description Local endpoint targeting persisted in `settings` — mirrors DriverEndpointConfig
 * WITHOUT apiKey (never persisted).
 * @public
 */
export interface ScheduledAgentJobEndpointSettings {
  readonly baseUrl: string;
  readonly configFilePath?: string;
  readonly provider?: 'lmstudio' | 'ollama' | null;
}

/**
 * @description Worktree options persisted in `settings` — mirrors DriverWorktreeOptions.
 * @public
 */
export interface ScheduledAgentJobWorktreeSettings {
  readonly skipWorktreeSetup?: boolean;
  readonly worktree?: string;
  readonly worktreeBase?: string;
}

/**
 * The exact typed subset persisted in `settings` (NOT a free-form JSON bag). Mirrors the drivers
 * package `AgentPromptSettings`; unknown keys are rejected on write and `endpoint.apiKey` is
 * disallowed.
 * @public
 */
export interface ScheduledAgentJobSettings {
  readonly endpoint?: ScheduledAgentJobEndpointSettings;
  readonly worktree?: ScheduledAgentJobWorktreeSettings;
}

/**
 * @description See {@link SCHEDULED_AGENT_JOB_MISFIRE_POLICIES}.
 * @public
 */
export type ScheduledAgentJobMisfirePolicy =
  (typeof SCHEDULED_AGENT_JOB_MISFIRE_POLICIES)[number];

/**
 * @description See {@link SCHEDULED_AGENT_JOB_CREATED_VIA}.
 * @public
 */
export type ScheduledAgentJobCreatedVia =
  (typeof SCHEDULED_AGENT_JOB_CREATED_VIA)[number];

/**
 * @description See {@link SCHEDULED_AGENT_JOB_APPROVAL_STATES}.
 * @public
 */
export type ScheduledAgentJobApprovalState =
  (typeof SCHEDULED_AGENT_JOB_APPROVAL_STATES)[number];

/**
 * @description See {@link SCHEDULED_AGENT_JOB_SCHEDULE_KINDS}.
 * @public
 */
export type ScheduledAgentJobScheduleKind =
  (typeof SCHEDULED_AGENT_JOB_SCHEDULE_KINDS)[number];

/**
 * @description Scalar/column fields of {@link ScheduledAgentJob} surfaced to the API.
 * @public
 */
export type ScheduledAgentJobData = Pick<
  ScheduledAgentJob,
  | 'approvalState'
  | 'createdAt'
  | 'createdVia'
  | 'cronPattern'
  | 'cwd'
  | 'driverId'
  | 'enabled'
  | 'id'
  | 'idempotencyKey'
  | 'intervalMs'
  | 'lastRunAt'
  | 'misfirePolicy'
  | 'misfireThresholdMs'
  | 'model'
  | 'name'
  | 'nextRunAt'
  | 'ownerUserId'
  | 'prompt'
  | 'repositoryCheckoutId'
  | 'runAt'
  | 'scheduleKind'
  | 'schedulerKey'
  | 'settings'
  | 'timeoutMs'
  | 'timezone'
  | 'updatedAt'
>;

/**
 * @description Fields a caller supplies to create a schedule; `schedulerKey` is derived from the
 * new id.
 * @public
 */
export interface CreateScheduledAgentJobInput {
  /** Command patterns the run may execute unprompted (migration 205); omitted stores none. */
  readonly allowedCommands?: readonly string[];
  /** Omitted keeps the column default (`not_required`). */
  readonly approvalState?: ScheduledAgentJobApprovalState;
  /** Omitted keeps the column default (`ui`). */
  readonly createdVia?: ScheduledAgentJobCreatedVia;
  /** Required for a `cron` schedule (the DB CHECK enforces it); null for interval and once. */
  readonly cronPattern: string | null;
  readonly cwd?: string | null;
  readonly driverId: ScheduledAgentJobDriverId;
  readonly enabled?: boolean;
  /** Agent-path idempotency key; null or omitted for none. */
  readonly idempotencyKey?: string | null;
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

/**
 * @description A create that the per-owner caps apply to: the owner is required.
 * @public
 */
export interface CreateOwnedScheduledAgentJobInput extends CreateScheduledAgentJobInput {
  readonly ownerUserId: string;
}

/**
 * @description The per-owner job caps `createJobWithinOwnerCaps` enforces: every live job, and the
 * live jobs created through the agent (`mcp`) path.
 * @public
 */
export interface ScheduledAgentJobOwnerCaps {
  readonly maxMcpPerOwner: number;
  readonly maxPerOwner: number;
}

/**
 * @description Outcome of `createJobWithinOwnerCaps`: the new job, or which cap refused it with the
 * owner's count at the time.
 * @public
 */
export type CreateScheduledAgentJobWithinCapsResult =
  | {
      readonly count: number;
      readonly limit: number;
      readonly ok: false;
      readonly scope: 'all' | 'mcp';
    }
  | { readonly job: ScheduledAgentJob; readonly ok: true };

/**
 * @description Mutable fields of a schedule; omitted fields are left unchanged.
 * @public
 */
export type UpdateScheduledAgentJobInput = Partial<
  Omit<
    CreateScheduledAgentJobInput,
    'createdVia' | 'idempotencyKey' | 'ownerUserId'
  >
>;

/**
 * @description The custom (non-`BaseRepository`) methods of {@link ScheduledAgentJobsRepository}.
 * @public
 */
export type ScheduledAgentJobsRepositoryMethod =
  | 'countJobsForOwner'
  | 'createJob'
  | 'createJobWithinOwnerCaps'
  | 'deleteJob'
  | 'findJobByIdempotencyKey'
  | 'findJobById'
  | 'listEnabledJobs'
  | 'listJobs'
  | 'setJobEnabled'
  | 'updateJob'
  | 'updateNextRunAt';

/**
 * @description One `Mock` per {@link ScheduledAgentJobsRepositoryMethod}, typed with the real
 * signature.
 * @public
 */
export type ScheduledAgentJobsRepositoryMethodMocks = {
  readonly [TMethod in ScheduledAgentJobsRepositoryMethod]: Mock<
    ScheduledAgentJobsRepository[TMethod]
  >;
};

/**
 * @description A {@link ScheduledAgentJobsRepository} mock: every inherited `BaseRepository`
 * method plus one `Mock` per scheduled-agent-jobs method.
 * @public
 */
export interface ScheduledAgentJobsRepositoryMock
  extends
    BaseRepositoryMock<ScheduledAgentJob, CreateModelInput<ScheduledAgentJob>>,
    ScheduledAgentJobsRepositoryMethodMocks {}

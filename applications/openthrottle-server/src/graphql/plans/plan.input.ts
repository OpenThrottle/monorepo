/**
 * @description GraphQL input types for plan mutations and multi-arg queries. Replaces many individual @Args with a single input object.
 */

import { Field, ID, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { OffsetPaginationInput } from '@openthrottle/nestjs-graphql';
import { PLAN_STATUS_LIST } from '@openthrottle/nestjs-repositories-server';

import { PlanTaskStatus } from './plan-task-status.enum.ts';

/**
 * @description Agent CLI logging level for a plan run.
 */
const PlanRunDebugCliGraphQL = {
  debug: 'debug',
  omit: 'omit',
  verbose: 'verbose',
} as const;

type PlanRunDebugCliGraphQL =
  (typeof PlanRunDebugCliGraphQL)[keyof typeof PlanRunDebugCliGraphQL];

registerEnumType(PlanRunDebugCliGraphQL, {
  description: `Agent CLI logging for a plan run: omit (default), --debug, or --verbose.`,
  name: 'PlanRunDebugCli',
});

/**
 * @description Plan vs task-centric scope for a plan run.
 */
export const PlanRunModeGraphQL = {
  plan: 'plan',
  task: 'task',
} as const;

export type PlanRunModeGraphQL =
  (typeof PlanRunModeGraphQL)[keyof typeof PlanRunModeGraphQL];

registerEnumType(PlanRunModeGraphQL, {
  description: `Plan-scoped run (default) or task-centric run ("task" requires taskId).`,
  name: 'PlanRunMode',
});

@InputType()
export class CreatePlanInput {
  @Field(() => String, { nullable: true })
  assignee?: string | null;

  @Field(() => String)
  author!: string;

  @Field(() => String)
  category!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => ID, {
    description: `Optional client-chosen plan id (UUID) that makes the create idempotent. Re-sending a create with the same id and title returns the plan the first call created instead of inserting a second, so a caller whose request timed out can retry safely. A different title under an existing id is refused.`,
    nullable: true,
  })
  id?: string | null;

  @Field(() => String, {
    deprecationReason: `Free-text label, unrelated to projects and superseded by projectId.`,
    nullable: true,
  })
  project?: string | null;

  @Field(() => ID, {
    description: `Optional. Project UUID (FK to projects table). Omit or pass null when plan is not linked to a project.`,
    nullable: true,
  })
  projectId?: string | null;

  @Field(() => String, { nullable: true })
  status?: string | null;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String)
  title!: string;

  @Field(() => String, {
    description: `JSON string of the plan run configuration (PlanRunConfigStorage v1). Omit to use defaults.`,
    nullable: true,
  })
  runConfigJson?: string | null;

  @Field(() => String, {
    description: `Optional. Absolute path of the caller's workspace (typically the MCP client's cwd). Resolved SERVER-SIDE to one of the caller's own registered checkouts and recorded as the plan's default run workspace, so the Configuration tab opens pre-selected. Treated as a hint, never trusted: a path the caller does not own, an unregistered path or a relative path is ignored. Ignored entirely when runConfigJson already names a workspace, and never fails plan creation.`,
    nullable: true,
  })
  workspacePath?: string | null;
}

@InputType()
export class CreatePlansInput {
  @Field(() => [CreatePlanInput], {
    description: `Plans to create atomically in one transaction. Each item carries its own author/category/title (same shape as createPlan).`,
  })
  plans!: CreatePlanInput[];
}

@InputType()
export class UpdatePlanInput {
  @Field(() => String, { nullable: true })
  assignee?: string | null;

  @Field(() => String, { nullable: true })
  author?: string | null;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => ID, { description: 'Plan id to update' })
  id!: string;

  @Field(() => String, {
    deprecationReason: `Free-text label, unrelated to projects and superseded by projectId.`,
    nullable: true,
  })
  project?: string | null;

  @Field(() => ID, {
    description: `Optional. Project UUID (FK to projects table). Pass null to clear; omit to leave unchanged.`,
    nullable: true,
  })
  projectId?: string | null;

  @Field(() => String, { nullable: true })
  status?: string | null;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => String, {
    description: `JSON string of job-run lifecycle hooks ({ hooks: [...] }). Pass null to clear; omit to leave unchanged.`,
    nullable: true,
  })
  jobRunHooksJson?: string | null;

  @Field(() => String, {
    description: `JSON string of the plan run configuration (PlanRunConfigStorage v1). Pass null to reset to default v1 shell; omit to leave unchanged.`,
    nullable: true,
  })
  runConfigJson?: string | null;
}

@InputType()
export class ListPlansByStatusInput extends OffsetPaginationInput {
  @Field(() => [String], {
    description: `Filter by author or assignee (any match). Empty means no assignee filter.`,
    nullable: 'itemsAndList',
  })
  assignees?: string[] | null;

  @Field(() => String, {
    deprecationReason: `Free-text label, unrelated to projects and superseded by projectId.`,
    nullable: true,
  })
  project?: string | null;

  @Field(() => ID, { nullable: true })
  projectId?: string | null;

  @Field(() => String, {
    description: `Sort by "created" or "updated"`,
    nullable: true,
  })
  sortBy?: 'created' | 'updated' | null;

  @Field(() => String, {
    description: `Sort order "asc" or "desc"`,
    nullable: true,
  })
  sortOrder?: 'asc' | 'desc' | null;

  @Field(() => [String], {
    deprecationReason: `Use statusesEnum (typed PlanTaskStatus) for an introspectable, validated filter. String statuses are still accepted (case-insensitive) and merged with statusesEnum.`,
    description: `Filter by plan status. Empty or including "all" means no status filter. Values must be canonical PlanTaskStatus labels (uppercase, e.g. IN_PROGRESS).`,
    nullable: 'itemsAndList',
  })
  statuses?: string[] | null;

  @Field(() => [PlanTaskStatus], {
    description: `Filter by plan status using the typed PlanTaskStatus enum (preferred over statuses). Merged with any values passed in statuses.`,
    nullable: 'itemsAndList',
  })
  statusesEnum?: PlanTaskStatus[] | null;

  @Field(() => String, {
    description: `Filter plans whose title contains this substring (case-insensitive)`,
    nullable: true,
  })
  titleSubstring?: string | null;
}

@InputType()
export class SearchPlansInput {
  @Field(() => Int, { nullable: true })
  limit?: number | null;

  @Field(() => String, {
    description: `Semantic search query (embedded for vector similarity)`,
  })
  query!: string;
}

@InputType()
export class DeletePlanInput {
  @Field(() => ID, { description: `Plan id to delete` })
  id!: string;
}

@InputType()
export class ReschedulePlanRunInput {
  @Field(() => ID, { description: 'Plan id the scheduled run belongs to.' })
  planId!: string;

  @Field(() => ID, {
    description: `plan_runs id of the SCHEDULED run to move. Any other status is rejected.`,
  })
  planRunId!: string;

  @Field(() => Date, {
    description: `The new absolute instant the run fires at: in the future and within 30 days (SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS), the same rule as schedulePlanRun.`,
  })
  scheduledFor!: Date;
}

@InputType()
export class CancelPlanRunInput {
  @Field(() => ID, {
    description: `Plan id whose in-queue plan-run job should be cancelled`,
  })
  planId!: string;

  @Field(() => ID, {
    description: `Optional plan_runs id of a SCHEDULED run of this plan. When set, cancels only that run: its delayed job is removed and its row settles CANCELLED, with no effect on any other active run or the tasks; a SCHEDULED plan returns to PENDING. Already-settled runs are a no-op; a run that is QUEUED or IN_PROGRESS is rejected (omit planRunId to stop a live run). When omitted, the whole plan is cancelled as before.`,
    nullable: true,
  })
  planRunId?: string | null;
}

@InputType()
export class PlanRunTuningInput {
  @Field(() => PlanRunDebugCliGraphQL, {
    description: `Agent CLI logging for the run: omit, debug or verbose. Omit this field for the verbose default.`,
    nullable: true,
  })
  debugCli?: PlanRunDebugCliGraphQL | null;

  @Field(() => String, {
    description: `Agent driver to run with (e.g. claude, codex, cursor). Omit to use the default.`,
    nullable: true,
  })
  driver?: string | null;

  @Field(() => String, {
    description: `Reasoning-effort level for the run: "low", "medium", "high", "extraHigh", "max", or "ultra" (the same vocabulary as the chat composer's reasoning). Nullable + additive: omit to leave the run's effort unchanged. An unrecognized level is rejected. Recorded on the run's runConfigSnapshot and forwarded to the agent CLI, where each driver maps it to its own flag (claude --effort, codex -c model_reasoning_effort=, grok --reasoning-effort, opencode --variant), clamping to its accepted set; a driver with no reasoning knob (antigravity, cursor) ignores it.`,
    nullable: true,
  })
  effort?: string | null;

  @Field(() => Int, {
    description: `Per-attempt agent timeout in seconds (positive integer). Omit for no timeout.`,
    nullable: true,
  })
  iterationTimeoutSeconds?: number | null;

  @Field(() => String, {
    description: `Model id passed to the agent CLI.`,
    nullable: true,
  })
  model?: string | null;

  @Field(() => String, {
    description: `Worktree name override for this run. When omitted, OpenThrottle derives plan-<short plan id> and creates that worktree itself. Every run gets a worktree.`,
    nullable: true,
  })
  worktreeName?: string | null;
}

/**
 * The fields a run is configured with, shared by {@link EnqueuePlanRunInput} (run now) and
 * {@link SchedulePlanRunInput} (run later). Abstract: it is not a GraphQL type of its own, so each
 * subclass adds only the opt-in that fits it (`cancelScheduled` / `replaceScheduled`).
 */
@InputType({ isAbstract: true })
export class PlanRunOptionsInput {
  @Field(() => String, {
    description: `REQUIRED git branch this run operates on. Captured on plan_runs.branch as run provenance (powers branch->PR mapping). Passed explicitly by callers (skills/UI may pre-fill a default from the worktree name / HEAD) and never inferred server-side; enqueue fails fast when missing or blank.`,
  })
  branch!: string;

  @Field(() => String, {
    description: `Optional dedupe key passed to BullMQ as jobId. Re-enqueue with the same key returns the existing job id instead of creating a duplicate.`,
    nullable: true,
  })
  idempotencyKey?: string | null;

  @Field(() => ID, { description: `Plan id to enqueue a run for` })
  planId!: string;

  @Field(() => Int, {
    description: `Job priority (lower = higher priority). 1=interactive/UI, 10=normal (default), 100=batch/scheduled. Omit to use normal priority.`,
    nullable: true,
  })
  priority?: number | null;

  @Field(() => PlanRunTuningInput, {
    description: `Optional runtime tuning for the run: driver, model, reasoning effort, agent CLI logging and a worktree name override. Omitted fields keep their defaults.`,
    nullable: true,
  })
  tuning?: PlanRunTuningInput | null;

  @Field(() => ID, {
    description: `Optional registered checkout id (highest precedence). Resolved server-side to its filesystem path for this run; when set it overrides repositoryId and workingDirectory.`,
    nullable: true,
  })
  checkoutId?: string | null;

  @Field(() => ID, {
    description: `Optional registered repository id. Resolved to the enqueuing user's single checkout of that repository (errors when there is no checkout, or when it is ambiguous). Used when checkoutId is omitted.`,
    nullable: true,
  })
  repositoryId?: string | null;

  @Field(() => String, {
    description: `Optional absolute path to a local project directory used as the working directory for this run. Escape hatch used only when checkoutId and repositoryId are omitted. When all three are omitted, defaults to the monorepo root (WORKSPACE_ROOT or process.cwd()). Must be an existing directory; validated server-side.`,
    nullable: true,
  })
  workingDirectory?: string | null;

  @Field(() => String, {
    description: `Optional JSON override for job-run lifecycle hooks for this enqueue only ({ hooks: [...] }). When omitted, hooks are copied from the plan. Validated against repo paths when workingDirectory is set.`,
    nullable: true,
  })
  jobRunHooksJson?: string | null;
}

/** Input for {@link PlansResolver.enqueuePlanRun}: a whole-plan run or, with `mode` task, one task. */
@InputType()
export class EnqueuePlanRunInput extends PlanRunOptionsInput {
  @Field(() => Boolean, {
    description: `Set true to run a SCHEDULED plan now: its scheduled run is cancelled and this run is enqueued in its place, in one transaction. Without it, enqueuing a plan that has a scheduled run fails with extensions.code PLAN_ALREADY_SCHEDULED (plus planRunId and scheduledFor).`,
    nullable: true,
  })
  cancelScheduled?: boolean | null;

  @Field(() => PlanRunModeGraphQL, {
    description: `Omit or "plan" for a plan-scoped run; "task" requires taskId (task-centric run).`,
    nullable: true,
  })
  mode?: PlanRunModeGraphQL | null;

  @Field(() => ID, {
    description: `Required when mode is task; must belong to the plan.`,
    nullable: true,
  })
  taskId?: string | null;
}

/**
 * Input for {@link PlansResolver.schedulePlanRun}: the same run options as {@link EnqueuePlanRunInput}
 * plus the instant the run fires at, so a scheduled run is configured the same way an immediate one is.
 */
@InputType()
export class SchedulePlanRunInput extends PlanRunOptionsInput {
  @Field(() => Boolean, {
    description: `Set true to reschedule a SCHEDULED plan: its scheduled run is cancelled and this one recorded in its place, in one transaction; the plan stays SCHEDULED. Without it, scheduling a plan that already has a scheduled run fails with extensions.code PLAN_ALREADY_SCHEDULED. Only PENDING and BACKLOG plans can be scheduled otherwise (PLAN_ACTIVE for QUEUED / IN_PROGRESS, PLAN_NOT_SCHEDULABLE for BLOCKED and terminal plans).`,
    nullable: true,
  })
  replaceScheduled?: boolean | null;

  @Field(() => Date, {
    description: `REQUIRED absolute instant the run fires at (an ISO-8601 DateTime; send UTC or an explicit offset). Must be strictly in the future and no more than 30 days from now (SCHEDULED_PLAN_RUN_MAX_HORIZON_DAYS); the server rejects anything else.`,
  })
  scheduledFor!: Date;
}

@InputType()
export class PlanRunsByPlanIdInput {
  @Field(() => Boolean, {
    description: `When true, every SCHEDULED run of the plan is returned however old its row is, and limit caps only the runs that are not SCHEDULED. Rows stay newest createdAt first, so the first row is then not necessarily the newest run. Default false: limit caps every run.`,
    nullable: true,
  })
  includeAllScheduled?: boolean | null;

  @Field(() => Int, {
    description: `Max plan-run audit rows to return, newest first.`,
    nullable: true,
  })
  limit?: number | null;

  @Field(() => ID, {
    description: `Plan id whose run audit rows should be returned`,
  })
  planId!: string;
}

/** Input for {@link PlansResolver.registerPlanRun}: a run whose owner is outside the queue, such as an interactive /ot-loop. */
@InputType()
export class RegisterPlanRunInput {
  @Field(() => String, {
    description: `OPTIONAL git branch this run operates on. Captured on plan_runs.branch as run provenance. Omit or null → store null; non-empty strings are stored verbatim (no server-side trim/reject — enqueue remains the REQUIRED branch boundary).`,
    nullable: true,
  })
  branch?: string | null;

  @Field(() => String, {
    description: `Agent driver for this run: antigravity, claude, codex, cursor, grok, or opencode.`,
  })
  driver!: string;

  @Field(() => Boolean, {
    description: `Whether this run's owner bumps its heartbeat on a ~15s timer. Omit or null → true. Pass false for an owner with no timer — an interactive /ot-loop agent turn, where a single test run outlives the staleness cutoff. A false run is exempt from the stale sweep, always reports isStale false, and can never yield RUN_STOPPING on cancel; nothing server-side will ever settle it, so its owner must.`,
    nullable: true,
  })
  heartbeatExpected?: boolean | null;

  @Field(() => String, {
    description: `Host the run owner is on (diagnostic; cleared on settle). Null when unknown.`,
    nullable: true,
  })
  hostname?: string | null;

  @Field(() => String, {
    description: `OPTIONAL resolved agent model id for this run (e.g. claude-opus-5). Captured on plan_runs.model as run provenance. Omit or null → store null; non-empty strings are stored verbatim. Prefer null over a guess: a wrong value here is worse than a missing one, because nothing downstream can tell it is wrong.`,
    nullable: true,
  })
  model?: string | null;

  @Field(() => Int, {
    description: `OS process id of the run owner (cleared on settle). Null when unknown.`,
    nullable: true,
  })
  pid?: number | null;

  @Field(() => ID, { description: `Plan id this run executes.` })
  planId!: string;

  @Field(() => String, {
    description: `Worker/run identifier of the run owner (cleared on settle). Null when unknown.`,
    nullable: true,
  })
  workerId?: string | null;
}

/** Input for {@link PlansResolver.settlePlanRun}: settle a run whose owner is outside the queue. */
@InputType()
export class SettlePlanRunInput {
  @Field(() => String, {
    description: `Branch head sha at PR-open. Recorded as a git_commit artifact on COMPLETED; the verifier maps it to its squash commit once the PR merges. Optional — a run that exits without opening a PR has none.`,
    nullable: true,
  })
  headSha!: string | null;

  @Field(() => ID, {
    description: `Plan-run row id to settle (returned by registerPlanRun).`,
  })
  planRunId!: string;

  @Field(() => Int, {
    description: `Number of the PR the run opened. Recorded as a pull_request artifact on COMPLETED — it survives a rebase or amend, which the head sha does not. Optional.`,
    nullable: true,
  })
  prNumber!: number | null;

  @Field(() => String, {
    description: `Terminal status to set: COMPLETED, CANCELLED, FAILED, or USAGE_LIMITED. Normalized to uppercase.`,
  })
  status!: string;

  @Field(() => Date, {
    description: `When the usage limit that stopped the run lifts, as reported by the agent CLI. Recorded only when status is USAGE_LIMITED; ignored otherwise. Null when the CLI reported no reset time.`,
    nullable: true,
  })
  usageLimitResetsAt!: Date | null;

  @Field(() => String, {
    description: `Raw name of the usage-limit window that stopped the run (five_hour, seven_day, ...). Recorded only when status is USAGE_LIMITED; ignored otherwise.`,
    nullable: true,
  })
  usageLimitType!: string | null;
}

/**
 * Input for {@link PlansResolver.forceSettlePlanRun}: a human's escape hatch for an unsupervised
 * run whose agent is gone. Deliberately carries NO status field — the mutation always writes
 * STALE, because a human clicking "settle" knows contact was lost, not how the work ended.
 */
@InputType()
export class ForceSettlePlanRunInput {
  @Field(() => ID, {
    description: `Plan-run row id to force-settle to STALE. Must be an IN_PROGRESS run that does not heartbeat; anything else is refused.`,
  })
  planRunId!: string;

  @Field(() => String, {
    description: `Why the run is being settled, written to settledReason. Omit for a human's "contact lost"; an automated backstop (the Claude Code Stop janitor) names itself and its evidence.`,
    nullable: true,
  })
  reason!: string | null;
}

/** Input for {@link PlansResolver.recordPlanRunHeartbeat}: bump an externally owned run's liveness. */
@InputType()
export class RecordPlanRunHeartbeatInput {
  @Field(() => ID, {
    description: `Plan-run row id to bump the liveness heartbeat on (returned by registerPlanRun).`,
  })
  planRunId!: string;
}

/** Input for {@link PlansResolver.registerPlanRunWorktreeCheckout}. */
@InputType()
export class RegisterPlanRunWorktreeCheckoutInput {
  @Field(() => String, {
    description: `Absolute filesystem path of the resolved worktree for this run.`,
  })
  filesystemPath!: string;

  @Field(() => ID, {
    description: `Plan-run row id whose checkout_id (and branch) should be pointed at the linked worktree path.`,
  })
  planRunId!: string;
}

@InputType()
export class SetPlanStatusInput {
  @Field(() => ID, { description: `Plan id to update status for` })
  planId!: string;

  @Field(() => String, {
    deprecationReason: `Use statusEnum (typed PlanTaskStatus). String status is still accepted (normalized to uppercase) and validated against the canonical set.`,
    description: `New plan status — one of: ${PLAN_STATUS_LIST}. Normalized to uppercase. Provide this OR statusEnum.`,
    nullable: true,
  })
  status?: string | null;

  @Field(() => PlanTaskStatus, {
    description: `New plan status as the typed PlanTaskStatus enum (preferred over status). Provide this OR status.`,
    nullable: true,
  })
  statusEnum?: PlanTaskStatus | null;
}

/**
 * @description GraphQL input types for plan mutations and multi-arg queries. Replaces many individual @Args with a single input object.
 */

import { Field, ID, InputType, Int, registerEnumType } from '@nestjs/graphql';

/**
 * @description Matches {@link RalphNestedDebugCli} for nested `workflow-ralph` spawns.
 */
enum RalphNestedDebugCliGraphQL {
  debug = 'debug',
  omit = 'omit',
  verbose = 'verbose',
}

registerEnumType(RalphNestedDebugCliGraphQL, {
  description: `Nested workflow-ralph logging: omit (default CLI/env), --debug, or --verbose.`,
  name: 'RalphNestedDebugCli',
});

/**
 * @description Plan vs task-centric scope for in-process Ralph orchestrator runs (matches `WorkflowRalphContext` / CLI `--plan` vs `--task`).
 */
export enum PlanRalphWorkflowModeGraphQL {
  plan = 'plan',
  task = 'task',
}

registerEnumType(PlanRalphWorkflowModeGraphQL, {
  description: `Plan-scoped run (default) or task-centric run ("task" requires taskId).`,
  name: 'PlanRalphWorkflowMode',
});

@InputType()
export class CreatePlanInput {
  @Field(() => String, { nullable: true })
  assignee!: string | null;

  @Field(() => String)
  author!: string;

  @Field(() => String)
  category!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => ID, {
    description: `Optional. Project UUID (FK to projects table). Omit or pass null when plan is not linked to a project.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => String)
  title!: string;

  @Field(() => String, {
    description: `JSON string of workflow-ralph run configuration (PlanRunConfigStorage v1). Omit to use defaults.`,
    nullable: true,
  })
  runConfigJson!: string | null;
}

@InputType()
export class UpdatePlanInput {
  @Field(() => String, { nullable: true })
  assignee!: string | null;

  @Field(() => String, { nullable: true })
  author!: string | null;

  @Field(() => String, { nullable: true })
  category!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID, { description: 'Plan id to update' })
  id!: string;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => ID, {
    description: `Optional. Project UUID (FK to projects table). Pass null to clear; omit to leave unchanged.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, {
    description: `JSON string of job-run lifecycle hooks ({ hooks: [...] }). Pass null to clear; omit to leave unchanged.`,
    nullable: true,
  })
  jobRunHooksJson!: string | null;

  @Field(() => String, {
    description: `JSON string of workflow-ralph run configuration (PlanRunConfigStorage v1). Pass null to reset to default v1 shell; omit to leave unchanged.`,
    nullable: true,
  })
  runConfigJson!: string | null;
}

@InputType()
export class ListPlansByStatusInput {
  @Field(() => [String], {
    description: `Filter by author or assignee (any match). Empty means no assignee filter.`,
    nullable: 'itemsAndList',
  })
  assignees!: string[] | null;

  @Field(() => Int, { nullable: true })
  limit!: number | null;

  @Field(() => Int, { nullable: true })
  offset!: number | null;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => ID, { nullable: true })
  projectId!: string | null;

  @Field(() => String, {
    description: `Sort by "created" or "updated"`,
    nullable: true,
  })
  sortBy!: 'created' | 'updated' | null;

  @Field(() => String, {
    description: `Sort order "asc" or "desc"`,
    nullable: true,
  })
  sortOrder!: 'asc' | 'desc' | null;

  @Field(() => [String], {
    description: `Filter by plan status. Empty or including "all" means no status filter.`,
    nullable: 'itemsAndList',
  })
  statuses!: string[] | null;

  @Field(() => String, {
    description: `Filter plans whose title contains this substring (case-insensitive)`,
    nullable: true,
  })
  titleSubstring!: string | null;
}

@InputType()
export class SearchPlansInput {
  @Field(() => Int, { nullable: true })
  limit!: number | null;

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
export class CancelPlanRunInput {
  @Field(() => ID, {
    description: `Plan id whose in-queue run-plan (Ralph) job should be cancelled`,
  })
  planId!: string;
}

@InputType()
export class RalphPlanRunTuningInput {
  @Field(() => String, {
    description: `Execution backend (e.g. cursor). Omit to use worktree defaults.`,
    nullable: true,
  })
  backend!: string | null;

  @Field(() => Int, {
    description: `Per-iteration timeout in seconds (positive integer).`,
    nullable: true,
  })
  iterationTimeoutSeconds!: number | null;

  @Field(() => Int, {
    description: `Max Ralph iterations for this run (positive integer).`,
    nullable: true,
  })
  iterations!: number | null;

  @Field(() => String, {
    description: `Model id passed to workflow-ralph --model.`,
    nullable: true,
  })
  model!: string | null;

  @Field(() => String, {
    description: `Nx project name for workflow-ralph --project.`,
    nullable: true,
  })
  project!: string | null;

  @Field(() => String, {
    description: `Prompt profile path (e.g. /agents/ralph) for --prompt.`,
    nullable: true,
  })
  prompt!: string | null;

  @Field(() => String, {
    description: `Repo-relative or absolute path for --prompt-file (layer-1 prompt file).`,
    nullable: true,
  })
  promptFile!: string | null;

  @Field(() => RalphNestedDebugCliGraphQL, {
    description: `Whether to pass --debug / --verbose to nested workflow-ralph.`,
    nullable: true,
  })
  ralphDebugCli!: RalphNestedDebugCliGraphQL | null;

  @Field(() => String, {
    description: `Agent CLI worktree name for -w/--worktree on cursor-agent and claude. When omitted in a BullMQ worktree run, defaults to the acquired target id.`,
    nullable: true,
  })
  worktree!: string | null;

  @Field(() => String, {
    description: `Cursor-only: branch/ref for --worktree-base.`,
    nullable: true,
  })
  worktreeBase!: string | null;

  @Field(() => Boolean, {
    description: `Cursor-only: pass --skip-worktree-setup to cursor-agent.`,
    nullable: true,
  })
  skipWorktreeSetup!: boolean | null;
}

/** Input for {@link PlansResolver.enqueuePlanRun} (canonical spawn enqueue). Also accepted by deprecated `workflowPlanRun`. */
@InputType()
export class EnqueuePlanRunInput {
  @Field(() => ID, { description: `Plan id to enqueue a run for` })
  planId!: string;

  @Field(() => Int, {
    description: `Job priority (lower = higher priority). 1=interactive/UI, 10=normal (default), 100=batch/scheduled. Omit to use normal priority.`,
    nullable: true,
  })
  priority!: number | null;

  @Field(() => RalphPlanRunTuningInput, {
    description: `Optional Ralph / workflow-ralph runtime tuning (iterations, model, backend, etc.). When set, queued workers pass these to nested workflow-ralph; when omitted, defaults come from env and .workflow-ralph.json in the worktree cwd.`,
    nullable: true,
  })
  ralph?: RalphPlanRunTuningInput | null;

  @Field(() => String, {
    description: `Optional absolute path to a local project directory used as the working directory for this run. When omitted, defaults to the monorepo root (WORKSPACE_ROOT or process.cwd()). Must be an existing directory; validated server-side.`,
    nullable: true,
  })
  workingDirectory!: string | null;

  @Field(() => String, {
    description: `Optional JSON override for job-run lifecycle hooks for this enqueue only ({ hooks: [...] }). When omitted, hooks are copied from the plan. Validated against repo paths when workingDirectory is set.`,
    nullable: true,
  })
  jobRunHooksJson!: string | null;
}

@InputType()
export class EnqueuePlanRalphOrchestratorInput {
  @Field(() => String, {
    description: `Optional dedupe key passed to BullMQ as jobId. Re-enqueue with the same key returns the existing job id.`,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @Field(() => PlanRalphWorkflowModeGraphQL, {
    description: `Omit or "plan" for plan-scoped run; "task" requires taskId (task-centric).`,
    nullable: true,
  })
  mode!: PlanRalphWorkflowModeGraphQL | null;

  @Field(() => ID, { description: 'Plan id to run the orchestrator for' })
  planId!: string;

  @Field(() => Int, {
    description: `Job priority (lower = higher priority). Same as enqueuePlanRun.`,
    nullable: true,
  })
  priority!: number | null;

  @Field(() => RalphPlanRunTuningInput, {
    description: `Optional Ralph tuning for the in-process orchestrator (iterations, model, backend, etc.).`,
    nullable: true,
  })
  ralph?: RalphPlanRunTuningInput | null;

  @Field(() => ID, {
    description: `Required when mode is task; must belong to the plan.`,
    nullable: true,
  })
  taskId!: string | null;

  @Field(() => String, {
    description: `Optional absolute path to a local project directory used as the working directory for this run. When omitted, defaults to the monorepo root (WORKSPACE_ROOT or process.cwd()). Must be an existing directory; validated server-side.`,
    nullable: true,
  })
  workingDirectory!: string | null;

  @Field(() => String, {
    description: `Optional JSON override for job-run lifecycle hooks for this enqueue only ({ hooks: [...] }). When omitted, hooks are copied from the plan.`,
    nullable: true,
  })
  jobRunHooksJson!: string | null;
}

@InputType()
export class PlanRunsByPlanIdInput {
  @Field(() => Int, {
    description: `Max plan-run audit rows to return, newest first.`,
    nullable: true,
  })
  limit!: number | null;

  @Field(() => ID, {
    description: `Plan id whose run audit rows should be returned`,
  })
  planId!: string;
}

@InputType()
export class SetPlanStatusInput {
  @Field(() => ID, { description: `Plan id to update status for` })
  planId!: string;

  @Field(() => String, {
    description: `New status (e.g. COMPLETED, IN_PROGRESS, PENDING, QUEUED). Normalized to uppercase.`,
  })
  status!: string;
}

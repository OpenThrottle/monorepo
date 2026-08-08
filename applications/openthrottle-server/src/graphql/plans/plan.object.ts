/**
 * @description GraphQL ObjectType for Plan. Implements {@link PlanData} from @openthrottle/nestjs-repositories so the API shape stays in sync with the entity.
 */

import type {
  PlanData,
  PlanRunData,
  PlanRunExecutionBackend,
} from '@openthrottle/nestjs-repositories';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ProjectObject } from '../projects/project.object';

@ObjectType()
export class PlanObject implements PlanData {
  @Field(() => String, { nullable: true })
  assignee!: string | null;

  @Field(() => String)
  author!: string;

  @Field(() => String)
  category!: string;

  @Field(() => Date, {
    description: `Set once on transition into COMPLETED; cleared if status leaves COMPLETED. Null when never completed.`,
    nullable: true,
  })
  completedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => Boolean, {
    description: `True when saved workflow run configuration differs from canonical defaults.`,
  })
  hasCustomRunConfig?: boolean;

  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  project!: string | null;

  @Field(() => String, {
    description: `Optional. Project UUID (FK to projects table). Null when plan is not linked to a project.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => ProjectObject, {
    description: `Resolved project entity when projectId is set; null when projectId is unset.`,
    nullable: true,
  })
  projectRelation!: ProjectObject | null;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => Int, {
    description: `Number of tasks belonging to this plan. Resolved from tasks table.`,
  })
  taskCount?: number;

  @Field(() => String)
  title!: string;

  @Field(() => Date)
  updatedAt!: Date;
}

/** Plan count per status for sidebar/filters. */
@ObjectType()
export class PlanStatusCountObject {
  @Field(() => Int)
  count!: number;

  @Field(() => String)
  status!: string;
}

/**
 * Minimal plan reference returned by `resolvePlanRef` for short-id-prefix
 * lookups (⌘K commander). Just enough to render a confident redirect row
 * (`Open plan: <title> (f5e40886…)`) and resolve the short fragment to a full id.
 */
@ObjectType()
export class PlanRefObject {
  @Field(() => String, {
    description: 'Full plan UUID the prefix resolved to.',
  })
  id!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  title!: string;
}

@ObjectType()
export class PlanRunObject implements PlanRunData {
  @Field(() => String, {
    description:
      'BullMQ job id for this run. Null for detached-CLI runs that carry no queue job.',
    nullable: true,
  })
  bullmqJobId!: string | null;

  @Field(() => Date, {
    description:
      'Durable cancel-request marker: when a stop was requested for this run. Null when no cancel was requested. The run loop polls this and stops at the next iteration boundary.',
    nullable: true,
  })
  cancelRequestedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, {
    description: `Execution backend selected once for the whole run: cursor or claude.`,
  })
  executionBackend!: PlanRunExecutionBackend;

  @Field(() => String, {
    description:
      'Host the worker executing this run is on. Null when the run is not actively executing. Diagnostic only — cross-host OS kill is out of scope.',
    nullable: true,
  })
  hostname!: string | null;

  @Field(() => String)
  id!: string;

  @Field(() => Boolean, {
    description:
      'Derived: true when this run is IN_PROGRESS but its heartbeat is older than the staleness cutoff — i.e. the owning process crashed hard (SIGKILL/power-loss) and the row is stranded. The UI hides Kill for a stale run; a sweeper settles it to STALE. False for healthy or already-terminal runs.',
  })
  isStale!: boolean;

  @Field(() => Date, {
    description:
      'Liveness heartbeat: last time the owning run process reported it is alive (bumped ~every 15s, stamped at start). Null for legacy rows / rows that never started heartbeating. Drives isStale.',
    nullable: true,
  })
  lastHeartbeatAt!: Date | null;

  @Field(() => Int, {
    description:
      'OS process id of the worker executing this run. Null when not actively executing.',
    nullable: true,
  })
  pid!: number | null;

  @Field(() => String)
  planId!: string;

  @Field(() => String)
  queueName!: string;

  @Field(() => String, {
    description:
      'Identifier of the worker instance executing this run. Null when not actively executing.',
    nullable: true,
  })
  workerId!: string | null;

  @Field(() => String, {
    description: `Resolved workflow-ralph configuration at enqueue (PlanRunConfigSnapshot v1 JSON). Null for legacy runs.`,
    nullable: true,
  })
  runConfigSnapshotJson!: string | null;

  @Field(() => String, {
    description: 'Ralph run implementation: spawn or orchestrator.',
  })
  runKind!: 'orchestrator' | 'spawn';

  @Field(() => String)
  status!: string;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String, {
    description:
      'Git branch this run operates on, captured at kickoff (run provenance). Powers branch↔PR mapping. Null for legacy/backfilled rows that predate branch capture.',
    nullable: true,
  })
  branch!: string | null;

  @Field(() => String, {
    description:
      'Resolved agent model id for this run (e.g. claude-fable-5), captured at kickoff. Null for legacy rows lacking snapshot data.',
    nullable: true,
  })
  model!: string | null;

  /**
   * Carries the run's checkout id to the `checkout` field resolver. Not exposed
   * as a GraphQL field (consumers read the resolved `checkout` object instead).
   */
  checkoutId!: string | null;
}

/**
 * The run's on-disk checkout (kind='worktree' for provisioned runs), resolved by
 * joining plan_runs.checkout_id -> repository_checkouts. Its filesystemPath is
 * what "open in editor" deep-links resolve against.
 */
@ObjectType()
export class PlanRunCheckoutObject {
  @Field(() => String, { description: 'Human-readable checkout label.' })
  displayName!: string;

  @Field(() => String, {
    description: 'Absolute on-disk path of the checkout/worktree.',
  })
  filesystemPath!: string;

  @Field(() => String, {
    description: "Checkout kind: 'primary' or 'worktree'.",
  })
  kind!: string;
}

/**
 * The pull request linked to a run, resolved over the work-ledger bridge
 * (work_sessions.plan_run_id -> work_artifacts type='pull_request'). Powers
 * branch↔PR surfacing: the branch is on the run, the PR hangs off its session.
 */
@ObjectType()
export class PlanRunPullRequestObject {
  @Field(() => Int, { description: 'Pull request number.' })
  number!: number;

  @Field(() => String, { description: 'owner/repo the PR belongs to.' })
  repo!: string;

  @Field(() => String, {
    description: "Lifecycle state of the PR: 'open', 'merged', or 'closed'.",
    nullable: true,
  })
  state!: string | null;

  @Field(() => String, { description: 'Canonical GitHub URL for the PR.' })
  url!: string;
}

/** Result of listPlansByStatus: plans and total count. */
@ObjectType()
export class ListPlansByStatusResultObject {
  @Field(() => [PlanObject])
  plans!: PlanObject[];

  @Field(() => Int)
  totalCount!: number;
}

/** Result of createPlans: the plans created in the batch and how many. */
@ObjectType()
export class CreatePlansResultObject {
  @Field(() => [PlanObject])
  plans!: PlanObject[];

  @Field(() => Int)
  totalCount!: number;
}

/** Result of enqueuePlanRun (and deprecated workflowPlanRun alias): job id, plan id, and queue position for UI feedback. */
@ObjectType()
export class EnqueuePlanRunResultObject {
  @Field(() => String, {
    description: `Execution backend selected once for the whole run: cursor or claude.`,
  })
  executionBackend!: PlanRunExecutionBackend;

  @Field(() => String, { description: 'BullMQ job id' })
  jobId!: string;

  @Field(() => String, { description: 'Plan id that was enqueued' })
  planId!: string;

  @Field(() => Int, {
    description: `Position of this job in the waiting queue (1-based). E.g., 1 means next to be processed.`,
  })
  queuePosition!: number;

  @Field(() => Int, {
    description: `Total number of jobs waiting in the queue (including this one).`,
  })
  queueTotal!: number;
}

/** Result of cancelPlanRun: removed job ids, active jobs that stayed locked, and optional plan status update. */
@ObjectType()
export class CancelPlanRunResultObject {
  @Field(() => [String], {
    description: `BullMQ job ids that were active (locked by a worker) and could not be removed from the queue. When "signaledActiveRunToStop" is true, the worker was asked to terminate the Ralph child for this plan.`,
  })
  activeJobIdsCouldNotCancel!: string[];

  @Field(() => Boolean, {
    description: `True when an in-flight plan run was signaled to stop (Ralph child receives SIGTERM, then SIGKILL if needed). The BullMQ job may still be active until the worker finishes.`,
  })
  signaledActiveRunToStop!: boolean;

  @Field(() => Boolean, {
    description: `True when a durable cancel marker was stamped on a live run (the cross-process/host/CLI guarantee). The run stops at its next iteration boundary even if the low-latency pub/sub signal was missed.`,
  })
  cancelRequested!: boolean;

  @Field(() => String, {
    description: `Machine-readable primary outcome for UI messaging: RUN_CANCELLED (queued job removed), RUN_STOPPING (active run signaled to stop), CANCELLATION_REQUESTED (durable cancel requested; stops at next checkpoint), or NO_ACTIVE_RUN (nothing to cancel).`,
  })
  outcome!: string;

  @Field(() => Boolean, {
    description: `True when no run-plan job for this plan existed in waiting, delayed, paused, active, or prioritized state.`,
  })
  noMatchingJob!: boolean;

  @Field(() => String, {
    description: `Plan status after cancel when a queued job was removed or an active run was signaled to stop (typically PENDING). Null when neither applied.`,
    nullable: true,
  })
  planStatusAfter!: string | null;

  @Field(() => String, { description: 'Plan id from the request.' })
  planId!: string;

  @Field(() => [String], {
    description: `BullMQ job ids removed from the queue (waiting, delayed, paused, prioritized).`,
  })
  removedJobIds!: string[];
}

/**
 * Ack for evaluatePlanRules: evaluation is async/queued, so the mutation only
 * confirms a full pass was enqueued. Matched/dispatched actions land in the
 * rule_applications ledger (read via planRuleApplications), not in this result.
 */
@ObjectType()
export class EvaluatePlanRulesResultObject {
  @Field(() => Boolean, {
    description: `True when a full plan-rules evaluation pass was enqueued.`,
  })
  enqueued!: boolean;

  @Field(() => String, {
    description: 'Plan id that was enqueued for evaluation.',
  })
  planId!: string;

  @Field(() => String, {
    description: `Trigger kind recorded on the enqueued pass (always "manual" for this mutation).`,
  })
  triggerKind!: string;
}

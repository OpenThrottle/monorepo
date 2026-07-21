/**
 * @description GraphQL ObjectType for Plan. Implements {@link PlanData} from @openthrottle/nestjs-repositories so the API shape stays in sync with the entity.
 */

import type { PlanData, PlanRunData } from '@openthrottle/nestjs-repositories';
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
  executionBackend!: 'claude' | 'cursor' | 'opencode';

  @Field(() => String, {
    description:
      'Host the worker executing this run is on. Null when the run is not actively executing. Diagnostic only — cross-host OS kill is out of scope.',
    nullable: true,
  })
  hostname!: string | null;

  @Field(() => String)
  id!: string;

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
  executionBackend!: 'claude' | 'cursor' | 'opencode';

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

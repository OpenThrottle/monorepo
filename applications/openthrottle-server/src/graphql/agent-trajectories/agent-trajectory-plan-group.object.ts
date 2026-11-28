/**
 * @description GraphQL ObjectTypes for agent trajectories grouped by their plan: the scoring list's
 * rows, the per-plan group with its progress counts, and the cursor page around them. Mirrors
 * `AgentTrajectoryPlanGroupPage` from @openthrottle/nestjs-repositories-server.
 */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('AgentTrajectoryPlanGroupItem', {
  description: `One trajectory in a plan group: the summary a scoring list shows, plus your verdict.`,
})
export class AgentTrajectoryPlanGroupItemObject {
  @Field(() => Int, {
    description: `Cached prompt tokens (included in inputTokens). Null when the run reported none.`,
    nullable: true,
  })
  cachedTokens!: number | null;

  @Field(() => Float, {
    description: `Cost of the run in USD. Null when unpriceable, which is not the same as zero.`,
    nullable: true,
  })
  costUsd!: number | null;

  @Field(() => Int, {
    description: `Wall-clock duration of the run in milliseconds. Null when unknown.`,
    nullable: true,
  })
  durationMs!: number | null;

  @Field(() => ID, { description: `Trajectory id.` })
  id!: string;

  @Field(() => Int, {
    description: `Prompt tokens consumed, including cached tokens. Null when the run reported none.`,
    nullable: true,
  })
  inputTokens!: number | null;

  @Field(() => Int, {
    description: `Completion tokens produced. Null when the run reported none.`,
    nullable: true,
  })
  outputTokens!: number | null;

  @Field(() => ID, { description: `Plan run the trajectory belongs to.` })
  planRunId!: string;

  @Field(() => Date, { description: `When the trajectory was recorded.` })
  recordedAt!: Date;

  @Field(() => String, {
    description: `How the trajectory was captured: spawned or session_upload.`,
  })
  source!: string;

  @Field(() => ID, {
    description: `Task the run worked on. Null for a plan-scoped trajectory.`,
    nullable: true,
  })
  taskId!: string | null;

  @Field(() => String, {
    description: `Title of the task the run worked on. Null for a plan-scoped trajectory.`,
    nullable: true,
  })
  taskTitle!: string | null;

  @Field(() => Boolean, {
    description: `True when the server elided observation content to fit the size caps.`,
  })
  truncated!: boolean;

  @Field(() => String, {
    description: `Your verdict on the trajectory (pass or fail). Null when you have not labelled it.`,
    nullable: true,
  })
  verdict!: string | null;
}

@ObjectType('AgentTrajectoryPlanGroup', {
  description: `One plan's recorded trajectories and your scoring progress on them. The counts cover every trajectory of the plan; trajectories holds only those the score-state filter kept. The plan fields are null for the one group that collects trajectories of deleted plans.`,
})
export class AgentTrajectoryPlanGroupObject {
  @Field(() => Int, { description: `Trajectories you labelled fail.` })
  failCount!: number;

  @Field(() => Int, { description: `Trajectories anyone has labelled.` })
  labelledCount!: number;

  @Field(() => Date, {
    description: `When the plan's newest trajectory was recorded.`,
  })
  latestRecordedAt!: Date;

  @Field(() => Int, { description: `Trajectories you labelled pass.` })
  passCount!: number;

  @Field(() => ID, {
    description: `The plan. Null for the group of trajectories whose plan was deleted.`,
    nullable: true,
  })
  planId!: string | null;

  @Field(() => String, {
    description: `The plan's status. Null when the plan was deleted.`,
    nullable: true,
  })
  planStatus!: string | null;

  @Field(() => String, {
    description: `The plan's title. Null when the plan was deleted.`,
    nullable: true,
  })
  planTitle!: string | null;

  @Field(() => Int, { description: `Trajectories you have labelled.` })
  scoredCount!: number;

  @Field(() => [AgentTrajectoryPlanGroupItemObject], {
    description: `The plan's trajectories the filter kept: plan-scoped ones first, then in task order, then oldest first.`,
  })
  trajectories!: AgentTrajectoryPlanGroupItemObject[];

  @Field(() => Int, { description: `Every trajectory recorded for the plan.` })
  trajectoryCount!: number;
}

@ObjectType('AgentTrajectoryPlanGroupPage', {
  description: `A page of plan groups, newest activity first.`,
})
export class AgentTrajectoryPlanGroupPageObject {
  @Field(() => String, {
    description: `Pass as after to read the next page. Null when the page is empty.`,
    nullable: true,
  })
  endCursor!: string | null;

  @Field(() => [AgentTrajectoryPlanGroupObject], {
    description: `The plan groups on this page.`,
  })
  groups!: AgentTrajectoryPlanGroupObject[];

  @Field(() => Boolean, {
    description: `True when another page follows this one.`,
  })
  hasNextPage!: boolean;
}

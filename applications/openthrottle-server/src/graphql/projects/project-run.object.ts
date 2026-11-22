/**
 * @description GraphQL ObjectType for one project run: a run of a project that enqueues its plans
 * one after another in project order, one draft PR each, and stops on the first plan that does not
 * finish. `currentPlan` and `stoppedByPlan` are resolved by ProjectRunResolver.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { Plan } from '@openthrottle/nestjs-repositories-server';

import { PlanObject } from '../plans/plan.object.ts';

@ObjectType({
  description: `A project run: the project's plans enqueued strictly one after another in project order, each done when its run settles COMPLETED with a draft PR. Resume a STOPPED run by calling runProject again; it passes over finished plans and starts at the one that stopped.`,
})
export class ProjectRunObject {
  @Field(() => Date, {
    description: `When a cancel was requested; null when none was.`,
    nullable: true,
  })
  cancelRequestedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => PlanObject, {
    description: `The plan the run is on now, or the last one it was on once settled. Null before the first plan is enqueued.`,
    nullable: true,
  })
  currentPlan?: Plan | PlanObject | null;

  @Field(() => ID, { nullable: true })
  currentPlanId!: string | null;

  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  projectId!: string;

  @Field(() => Date, {
    description: `When the run reached a terminal status; null while active.`,
    nullable: true,
  })
  settledAt!: Date | null;

  @Field(() => Date, {
    description: `When the run enqueued its first plan; null until then.`,
    nullable: true,
  })
  startedAt!: Date | null;

  @Field(() => String, {
    description: `QUEUED or IN_PROGRESS while active; COMPLETED (every plan done), STOPPED (a plan did not finish; see stoppedByPlan and stoppedReason) or CANCELLED once settled.`,
  })
  status!: string;

  @Field(() => PlanObject, {
    description: `For a STOPPED run, the plan that stopped it; a fresh runProject resumes there. Null otherwise.`,
    nullable: true,
  })
  stoppedByPlan?: Plan | PlanObject | null;

  @Field(() => ID, { nullable: true })
  stoppedByPlanId!: string | null;

  @Field(() => String, {
    description: `Why a STOPPED run stopped: the plan run status that ended it, a plan already BLOCKED, an unrelated active run on the plan, or an enqueue refusal. Null otherwise.`,
    nullable: true,
  })
  stoppedReason!: string | null;
}

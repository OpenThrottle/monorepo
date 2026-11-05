/**
 * @description GraphQL input types for the plan inbox queries and mutations.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

import { PlanMessageKind, PlanMessageStatus } from './plan-message.enum.ts';

@InputType()
export class ListPlanMessagesInput {
  @Field(() => [PlanMessageKind], {
    description: `Return only these kinds. Omit for every kind.`,
    nullable: true,
  })
  kinds!: PlanMessageKind[] | null;

  @Field(() => ID, { description: `Plan whose inbox to list.` })
  planId!: string;

  @Field(() => [PlanMessageStatus], {
    description: `Return only these statuses. Omit for every status.`,
    nullable: true,
  })
  statuses!: PlanMessageStatus[] | null;
}

@InputType()
export class PostPlanMessageInput {
  @Field(() => String, {
    description: `GitHub username to attribute the message to. Omit to stamp it from the caller's identity.`,
    nullable: true,
  })
  author!: string | null;

  @Field(() => String, { description: `Message text. Must not be blank.` })
  body!: string;

  @Field(() => PlanMessageKind, {
    description: `STEER or QUEUE for a live run (held PENDING for the next run when none is live); FEEDBACK for post-run reflection.`,
  })
  kind!: PlanMessageKind;

  @Field(() => ID, { description: `Plan to post the message to.` })
  planId!: string;

  @Field(() => ID, {
    description: `Task the author was looking at, for context. It does not decide delivery.`,
    nullable: true,
  })
  taskId!: string | null;
}

@InputType()
export class UpdatePlanMessageInput {
  @Field(() => String, { description: `Replacement text. Must not be blank.` })
  body!: string;

  @Field(() => ID, { description: `A PENDING message to edit.` })
  id!: string;
}

@InputType()
export class WithdrawPlanMessageInput {
  @Field(() => ID, { description: `A PENDING message to withdraw.` })
  id!: string;
}

@InputType()
export class ClaimPlanMessagesInput {
  @Field(() => ID, { description: `Plan whose pending inbox to claim.` })
  planId!: string;

  @Field(() => ID, {
    description: `The claiming run (plan_runs.id), stamped on each delivered message. Omit only when no run row exists.`,
    nullable: true,
  })
  planRunId!: string | null;

  @Field(() => ID, {
    description: `The task the agent is about to start; delivered messages and the audit chunk are attributed to it.`,
    nullable: true,
  })
  taskId!: string | null;
}

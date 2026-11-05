/**
 * @description GraphQL ObjectTypes for the plan inbox. Mirrors the plan_messages entity from
 * @openthrottle/nestjs-repositories (migration 144).
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

import { PlanOutputStreamChunkObject } from '../plan-output-stream/plan-output-stream-chunk.object.ts';
import { PlanMessageKind, PlanMessageStatus } from './plan-message.enum.ts';

@ObjectType({
  description: `A human message on a plan's inbox: a STEER or QUEUE for a live run, or post-run FEEDBACK.`,
})
export class PlanMessageObject {
  @Field(() => String, {
    description: `GitHub username of the human who wrote the message.`,
  })
  author!: string;

  @Field(() => String)
  body!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, {
    description: `When a run claimed the message. Null until DELIVERED.`,
    nullable: true,
  })
  deliveredAt!: Date | null;

  @Field(() => ID, {
    description: `Task the agent was about to start when the message was applied. Null until DELIVERED.`,
    nullable: true,
  })
  deliveredToTaskId!: string | null;

  @Field(() => ID)
  id!: string;

  @Field(() => PlanMessageKind)
  kind!: PlanMessageKind;

  @Field(() => ID)
  planId!: string;

  @Field(() => ID, {
    description: `Run that consumed the message. Null until DELIVERED, or when claimed outside a registered run.`,
    nullable: true,
  })
  planRunId!: string | null;

  @Field(() => PlanMessageStatus)
  status!: PlanMessageStatus;

  @Field(() => ID, {
    description: `Task the human was looking at when they wrote the message. Context only; it does not decide delivery.`,
    nullable: true,
  })
  taskId!: string | null;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType({
  description: `The outcome of claimPlanMessages: the messages just delivered, in delivery order (STEERs first), and the audit chunk recorded on the plan output stream.`,
})
export class ClaimPlanMessagesResultObject {
  @Field(() => PlanOutputStreamChunkObject, {
    description: `The plan output stream chunk that records this delivery. Null when nothing was pending.`,
    nullable: true,
  })
  auditChunk!: PlanOutputStreamChunkObject | null;

  @Field(() => [PlanMessageObject], {
    description: `Messages delivered by this claim, STEERs first then QUEUEs, oldest first within each kind. Empty when nothing was pending.`,
  })
  messages!: PlanMessageObject[];
}

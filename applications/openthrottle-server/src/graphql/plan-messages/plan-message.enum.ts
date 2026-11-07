/**
 * @description Registers the GraphQL enums `PlanMessageKind` and `PlanMessageStatus` from the
 * `as const` SSOT in @openthrottle/nestjs-repositories, which mirrors the plan_messages CHECKs
 * (migration 144). No literal list is maintained here.
 */

import { registerEnumType } from '@nestjs/graphql';
import {
  PLAN_MESSAGE_KIND,
  PLAN_MESSAGE_STATUS,
  type PlanMessageKind as PlanMessageKindValue,
  type PlanMessageStatus as PlanMessageStatusValue,
} from '@openthrottle/nestjs-repositories';

registerEnumType(PLAN_MESSAGE_KIND, {
  description: `What a plan inbox message is for. STEER: a correction that overrides the task description where they conflict, delivered first at the next task boundary. QUEUE: an extra requirement for the upcoming work, delivered after STEERs. FEEDBACK: post-run reflection; recorded, never delivered.`,
  name: 'PlanMessageKind',
});

registerEnumType(PLAN_MESSAGE_STATUS, {
  description: `Plan inbox message lifecycle. PENDING: waiting for the next task boundary. DELIVERED: claimed by a run (immutable). WITHDRAWN: retracted before delivery. RECORDED: FEEDBACK messages only.`,
  name: 'PlanMessageStatus',
});

/**
 * @description GraphQL enum reference for `@Field(() => PlanMessageKind)`; in the type namespace,
 * the union of kind labels.
 * @public
 */
export const PlanMessageKind = PLAN_MESSAGE_KIND;

/** @public */
export type PlanMessageKind = PlanMessageKindValue;

/**
 * @description GraphQL enum reference for `@Field(() => PlanMessageStatus)`; in the type namespace,
 * the union of status labels.
 * @public
 */
export const PlanMessageStatus = PLAN_MESSAGE_STATUS;

/** @public */
export type PlanMessageStatus = PlanMessageStatusValue;

/**
 * @description Code-first GraphQL types for real-time notification events — the
 * schema source of truth that replaces the hand-typed @openthrottle/openthrottle-notifications
 * payloads. A discriminated set: the NotificationEvent interface carries the shared
 * fields (event name, timestamp, severity, message, link) and each concrete type adds
 * its specifics. Subscriptions return the interface; clients select with inline
 * fragments (`... on TaskCompletedNotification { taskId }`).
 */
import { Field, ID, Int, InterfaceType, ObjectType } from '@nestjs/graphql';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';

/** Maps an event name to the concrete GraphQL type name for interface resolution. */
const EVENT_TYPE_NAMES: Record<string, string> = {
  [NOTIFICATION_EVENT_NAMES.DEBUG]: `DebugNotification`,
  [NOTIFICATION_EVENT_NAMES.PLAN_ENQUEUED]: `PlanEnqueuedNotification`,
  [NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED]: `PlanStatusChangedNotification`,
  [NOTIFICATION_EVENT_NAMES.PLAN_UPDATED]: `PlanUpdatedNotification`,
  [NOTIFICATION_EVENT_NAMES.PLAN_WAITING_FOR_WORKTREE]: `PlanWaitingForWorktreeNotification`,
  [NOTIFICATION_EVENT_NAMES.QUEUE_JOB_COMPLETED]: `QueueJobCompletedNotification`,
  [NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT]: `SystemAlertNotification`,
  [NOTIFICATION_EVENT_NAMES.TASK_COMPLETED]: `TaskCompletedNotification`,
  [NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED]: `TaskStatusChangedNotification`,
};

@InterfaceType({
  description: `Real-time notification event delivered over a GraphQL subscription.`,
  resolveType: (value: { event?: string }) =>
    (value.event && EVENT_TYPE_NAMES[value.event]) ?? 'SystemAlertNotification',
})
export abstract class NotificationEvent {
  @Field(() => String, {
    description: `Well-known event name (e.g. task.completed).`,
  })
  event!: string;

  @Field(() => String, {
    description: `ISO 8601 timestamp when the event occurred.`,
  })
  timestamp!: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, {
    description: `info | warning | error | success`,
    nullable: true,
  })
  severity?: string;

  @Field(() => String, {
    description: `App-relative click-through path.`,
    nullable: true,
  })
  link?: string;
}

@ObjectType({ implements: () => [NotificationEvent] })
export class DebugNotification extends NotificationEvent {
  @Field(() => String, {
    description: `JSON-encoded debug data.`,
    nullable: true,
  })
  dataJson?: string;
}

@ObjectType({ implements: () => [NotificationEvent] })
export class PlanEnqueuedNotification extends NotificationEvent {
  @Field(() => ID)
  planId!: string;

  @Field(() => Int)
  queuePosition!: number;

  @Field(() => Int)
  queueTotal!: number;
}

@ObjectType({ implements: () => [NotificationEvent] })
export class PlanUpdatedNotification extends NotificationEvent {
  @Field(() => ID)
  planId!: string;

  @Field(() => ID, { nullable: true })
  taskId?: string;
}

@ObjectType({ implements: () => [NotificationEvent] })
export class TaskCompletedNotification extends NotificationEvent {
  @Field(() => ID)
  planId!: string;

  // Nullable for consistency across the union (other events carry no taskId), so
  // a `taskId` selection merges cleanly in a single NotificationEvent fragment.
  @Field(() => ID, { nullable: true })
  taskId?: string;
}

@ObjectType({ implements: () => [NotificationEvent] })
export class QueueJobCompletedNotification extends NotificationEvent {
  @Field(() => String)
  jobType!: string;

  @Field(() => ID, { nullable: true })
  planId?: string;

  @Field(() => ID, { nullable: true })
  taskId?: string;
}

@ObjectType({ implements: () => [NotificationEvent] })
export class PlanWaitingForWorktreeNotification extends NotificationEvent {
  @Field(() => ID)
  planId!: string;

  @Field(() => Int)
  retryDelayMs!: number;
}

@ObjectType({ implements: () => [NotificationEvent] })
export class PlanStatusChangedNotification extends NotificationEvent {
  @Field(() => ID)
  planId!: string;

  @Field(() => String)
  status!: string;
}

@ObjectType({ implements: () => [NotificationEvent] })
export class SystemAlertNotification extends NotificationEvent {
  @Field(() => String, { nullable: true })
  code?: string;
}

@ObjectType({ implements: () => [NotificationEvent] })
export class TaskStatusChangedNotification extends NotificationEvent {
  @Field(() => ID)
  planId!: string;

  // Nullable for union-merge consistency (see TaskCompletedNotification.taskId).
  @Field(() => ID, { nullable: true })
  taskId?: string;

  @Field(() => String)
  status!: string;
}

/** All concrete notification object types — registered so the schema includes them. */
export const NOTIFICATION_EVENT_TYPES = [
  DebugNotification,
  PlanEnqueuedNotification,
  PlanStatusChangedNotification,
  PlanUpdatedNotification,
  PlanWaitingForWorktreeNotification,
  QueueJobCompletedNotification,
  SystemAlertNotification,
  TaskCompletedNotification,
  TaskStatusChangedNotification,
] as const;

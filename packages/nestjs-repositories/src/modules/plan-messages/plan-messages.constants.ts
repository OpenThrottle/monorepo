/**
 * @description String literals written to `plan_messages.kind` / `plan_messages.status` (CHECK-constrained
 * TEXT, migration 144). The SQL CHECKs and these objects must list the same values.
 * @public
 */

/**
 * What a plan inbox message is for. STEER and QUEUE are delivered to a live run at its next task
 * boundary (STEERs first); FEEDBACK is post-run reflection that is recorded and never delivered.
 * @public
 */
export const PLAN_MESSAGE_KIND = {
  FEEDBACK: 'FEEDBACK',
  QUEUE: 'QUEUE',
  STEER: 'STEER',
} as const;

/**
 * Lifecycle of a plan inbox message. PENDING → DELIVERED (claimed by a run; immutable) or
 * WITHDRAWN (retracted before delivery). RECORDED is the only status a FEEDBACK row takes.
 * @public
 */
export const PLAN_MESSAGE_STATUS = {
  DELIVERED: 'DELIVERED',
  PENDING: 'PENDING',
  RECORDED: 'RECORDED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

/**
 * The kinds a run claims, in delivery order: every STEER before any QUEUE.
 * @public
 */
export const PLAN_MESSAGE_DELIVERABLE_KINDS = [
  PLAN_MESSAGE_KIND.STEER,
  PLAN_MESSAGE_KIND.QUEUE,
] as const;

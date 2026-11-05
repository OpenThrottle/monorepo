/**
 * @description Types for the plan inbox (plan_messages, migration 144) shared by PlanMessagesService
 * and its callers.
 */

import type { PlanOutputStreamChunk } from '../plan-output-stream/plan-output-stream.entity.ts';
import type { PlanMessage } from './plan-message.entity.ts';
import type {
  PLAN_MESSAGE_KIND,
  PLAN_MESSAGE_STATUS,
} from './plan-messages.constants.ts';

/** @public */
export type PlanMessageKind =
  (typeof PLAN_MESSAGE_KIND)[keyof typeof PLAN_MESSAGE_KIND];

/** @public */
export type PlanMessageStatus =
  (typeof PLAN_MESSAGE_STATUS)[keyof typeof PLAN_MESSAGE_STATUS];

/** @public */
export interface PostPlanMessageParams {
  readonly author: string;
  readonly body: string;
  readonly kind: PlanMessageKind;
  readonly planId: string;
  readonly taskId: string | null;
}

/** @public */
export interface ListPlanMessagesParams {
  readonly kinds: readonly PlanMessageKind[] | null;
  readonly planId: string;
  readonly statuses: readonly PlanMessageStatus[] | null;
}

/** @public */
export interface ClaimPlanMessagesParams {
  readonly planId: string;
  readonly planRunId: string | null;
  readonly taskId: string | null;
}

/**
 * @description What a claim produced: the messages now DELIVERED, in delivery order, and the
 * single audit chunk written to plan_output_stream (null when nothing was pending).
 * @public
 */
export interface ClaimPlanMessagesResult {
  readonly auditChunk: PlanOutputStreamChunk | null;
  readonly messages: readonly PlanMessage[];
}

/**
 * @description Outcome of a write that only a PENDING message accepts (edit, withdraw).
 * @public
 */
export type PendingPlanMessageWriteResult =
  | { readonly message: PlanMessage; readonly ok: true }
  | { readonly ok: false; readonly reason: 'NOT_FOUND' | 'NOT_PENDING' };

/** @public */
export type PostPlanMessageResult =
  | { readonly message: PlanMessage; readonly ok: true }
  | { readonly ok: false; readonly reason: 'PLAN_NOT_FOUND' };

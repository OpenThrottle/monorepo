/**
 * @description Plan inbox tool handlers + schemas: post_plan_message, list_plan_messages,
 * claim_plan_messages, withdraw_plan_message. GraphQL-only — each delegates to the matching
 * openthrottle-server operation over plan_messages (migration 144).
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type { z } from 'zod';

import {
  ClaimPlanMessagesDocument,
  type ClaimPlanMessagesMutation,
  PlanMessagesDocument,
  type PlanMessagesQuery,
  PostPlanMessageDocument,
  type PostPlanMessageMutation,
  WithdrawPlanMessageDocument,
  type WithdrawPlanMessageMutation,
} from '../__generated__/graphql.js';
import {
  ClaimPlanMessagesInputSchema,
  ListPlanMessagesInputSchema,
  PostPlanMessageInputSchema,
  WithdrawPlanMessageInputSchema,
} from '../__generated__/schemas.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

type PlanMessage = PostPlanMessageMutation['postPlanMessage'];

type ClaimResult = ClaimPlanMessagesMutation['claimPlanMessages'];

/**
 * @description Renders delivered messages as the block an agent reads at a task boundary: STEERs
 * (which override the task description where they conflict) before QUEUEs.
 */
const formatDelivered = (messages: readonly PlanMessage[]): string => {
  return messages
    .map(
      (message) =>
        `[${message.kind} from @${message.author}] (message ${message.id})\n${message.body}`,
    )
    .join('\n\n');
};

// ── post_plan_message ────────────────────────────────────────────────────────

export const postPlanMessageToolParameters =
  PostPlanMessageInputSchema().strict();

export const postPlanMessageToolDescription = `Post a human message to a plan's inbox. kind STEER: a correction that overrides the task description where they conflict, delivered first at the run's next task boundary. kind QUEUE: an extra requirement for the upcoming work, delivered after STEERs. kind FEEDBACK: post-run reflection; recorded, never delivered. STEER/QUEUE stay PENDING until a run claims them, so a message posted with no live run goes to the plan's next run. author is the GitHub username; omit it to stamp the caller's identity. taskId is the task you were looking at, for context only.`;

export async function postPlanMessageToolHandler(
  args: z.infer<typeof postPlanMessageToolParameters>,
): Promise<GenericResult<{ message: PlanMessage }>> {
  const parsed = postPlanMessageToolParameters.safeParse(args);
  if (!parsed.success) return invalidArgsContent(parsed.error);

  return runTool<{ message: PlanMessage }>('post_plan_message', async () => {
    const result = await executeGraphqlWithAuth(
      getAuthToken(),
      PostPlanMessageDocument,
      {
        input: {
          author: parsed.data.author ?? null,
          body: parsed.data.body,
          kind: parsed.data.kind,
          planId: parsed.data.planId,
          taskId: parsed.data.taskId ?? null,
        },
      },
    );

    const message = result?.postPlanMessage ?? null;
    if (!message) return null;

    const text = `Posted ${message.kind} message ${message.id} to plan ${message.planId} (${message.status}).`;
    return { structuredContent: { message }, text };
  });
}

// ── list_plan_messages ───────────────────────────────────────────────────────

export const listPlanMessagesToolParameters =
  ListPlanMessagesInputSchema().strict();

export const listPlanMessagesToolDescription = `List a plan's inbox oldest first. Optional kinds (STEER, QUEUE, FEEDBACK) and statuses (PENDING, DELIVERED, WITHDRAWN, RECORDED) narrow the result. Read-only: listing PENDING messages does NOT deliver them — a run consumes them with claim_plan_messages.`;

export async function listPlanMessagesToolHandler(
  args: z.infer<typeof listPlanMessagesToolParameters>,
): Promise<GenericResult<{ messages: PlanMessagesQuery['planMessages'] }>> {
  const parsed = listPlanMessagesToolParameters.safeParse(args);
  if (!parsed.success) return invalidArgsContent(parsed.error);

  return runTool<{ messages: PlanMessagesQuery['planMessages'] }>(
    'list_plan_messages',
    async () => {
      const result = await executeGraphqlWithAuth(
        getAuthToken(),
        PlanMessagesDocument,
        {
          input: {
            kinds: parsed.data.kinds ?? null,
            planId: parsed.data.planId,
            statuses: parsed.data.statuses ?? null,
          },
        },
      );

      const messages = result?.planMessages ?? [];
      const isEmpty = messages.length === 0;
      const text = isEmpty
        ? `No inbox messages for plan ${parsed.data.planId}.`
        : JSON.stringify(messages, null, 2);

      return { structuredContent: { messages }, text };
    },
  );
}

// ── claim_plan_messages ──────────────────────────────────────────────────────

export const claimPlanMessagesToolParameters =
  ClaimPlanMessagesInputSchema().strict();

export const claimPlanMessagesToolDescription = `Claim a plan's pending STEER/QUEUE inbox at a task boundary — call it right after the cancel poll, before starting the next task. Marks every pending message DELIVERED (stamped with planRunId and the taskId you are about to start) and records the delivery on the plan output stream in one transaction, so each message is delivered exactly once. Returns STEERs first: apply them as overrides to the task description, then treat QUEUEs as extra requirements. A message you cannot honor must be explained in append_plan_output, never silently dropped.`;

export async function claimPlanMessagesToolHandler(
  args: z.infer<typeof claimPlanMessagesToolParameters>,
): Promise<GenericResult<{ claim: ClaimResult }>> {
  const parsed = claimPlanMessagesToolParameters.safeParse(args);
  if (!parsed.success) return invalidArgsContent(parsed.error);

  return runTool<{ claim: ClaimResult }>('claim_plan_messages', async () => {
    const result = await executeGraphqlWithAuth(
      getAuthToken(),
      ClaimPlanMessagesDocument,
      {
        input: {
          planId: parsed.data.planId,
          planRunId: parsed.data.planRunId ?? null,
          taskId: parsed.data.taskId ?? null,
        },
      },
    );

    const claim = result?.claimPlanMessages ?? null;
    if (!claim) return null;

    const isEmpty = claim.messages.length === 0;
    const deliveredText = `Delivered ${claim.messages.length} inbox message(s):\n\n${formatDelivered(claim.messages)}`;
    const text = isEmpty
      ? `No pending inbox messages for plan ${parsed.data.planId}.`
      : deliveredText;

    return { structuredContent: { claim }, text };
  });
}

// ── withdraw_plan_message ────────────────────────────────────────────────────

export const withdrawPlanMessageToolParameters =
  WithdrawPlanMessageInputSchema().strict();

export const withdrawPlanMessageToolDescription = `Withdraw a PENDING plan inbox message so no run receives it. Fails for a message that was already delivered, withdrawn or recorded.`;

export async function withdrawPlanMessageToolHandler(
  args: z.infer<typeof withdrawPlanMessageToolParameters>,
): Promise<
  GenericResult<{
    message: WithdrawPlanMessageMutation['withdrawPlanMessage'];
  }>
> {
  const parsed = withdrawPlanMessageToolParameters.safeParse(args);
  if (!parsed.success) return invalidArgsContent(parsed.error);

  return runTool<{
    message: WithdrawPlanMessageMutation['withdrawPlanMessage'];
  }>('withdraw_plan_message', async () => {
    const result = await executeGraphqlWithAuth(
      getAuthToken(),
      WithdrawPlanMessageDocument,
      { input: { id: parsed.data.id } },
    );

    const message = result?.withdrawPlanMessage ?? null;
    if (!message) return null;

    return {
      structuredContent: { message },
      text: `Withdrew message ${message.id} from plan ${message.planId}.`,
    };
  });
}

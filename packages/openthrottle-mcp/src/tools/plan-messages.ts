/**
 * @description Plan inbox tool handlers + schemas: post_plan_message and claim_plan_messages.
 * GraphQL-only — each delegates to the matching openthrottle-server operation over
 * plan_messages (migration 144). Listing and withdrawing are developer-UI actions, not MCP tools.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type { z } from 'zod';

import {
  ClaimPlanMessagesDocument,
  type ClaimPlanMessagesMutation,
  PostPlanMessageDocument,
  type PostPlanMessageMutation,
} from '../__generated__/graphql.js';
import {
  ClaimPlanMessagesInputSchema,
  PostPlanMessageInputSchema,
} from '../__generated__/schemas.ts';
import { getAuthToken } from '../auth/getAuthToken.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/runTool.ts';

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

export const postPlanMessageToolDescription = `Post a message to a plan's inbox. STEER overrides the task description where they conflict; QUEUE adds a requirement. Both stay PENDING until a run claims them at its next task boundary, or the plan's next run does. FEEDBACK is post-run reflection: recorded, never delivered. author is a GitHub username (defaults to the caller); taskId is context only.`;

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

// ── claim_plan_messages ──────────────────────────────────────────────────────

export const claimPlanMessagesToolParameters =
  ClaimPlanMessagesInputSchema().strict();

export const claimPlanMessagesToolDescription = `Claim a plan's pending STEER/QUEUE messages at a task boundary: after the cancel poll, before the next task starts. Claiming is delivery — each message is marked DELIVERED to your planRunId and taskId and logged to plan output, exactly once. Returns STEERs (overrides) before QUEUEs (extra requirements); acknowledge each in append_plan_output.`;

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

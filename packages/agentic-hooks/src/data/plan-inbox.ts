/**
 * Plan inbox claim: the GraphQL call that delivers a plan's pending STEER /
 * QUEUE messages to a running agent. Tool-neutral; each adapter decides when to
 * call it and how to render the result.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import type { HookFetch } from '../types.ts';
import { logHookError } from '../utils/logging.ts';
import { postGraphqlMutationNode } from './graphql.ts';

const CLAIM_MUTATION = `
mutation ClaimPlanMessagesFromHook($input: ClaimPlanMessagesInput!) {
  claimPlanMessages(input: $input) { messages { author body id kind } }
}
`;

/**
 * One delivered inbox message.
 *
 * @public
 */
export interface PlanInboxMessage {
  readonly author: string;
  readonly body: string;
  readonly id: string;
  readonly kind: string;
}

/**
 * The identifiers a claim is made for.
 *
 * @public
 */
export interface PlanInboxClaimTarget {
  readonly planId: string;
  readonly planRunId: string | null;
  readonly taskId: string | null;
}

/**
 * The claim call as the decision layer sees it: null on any failure.
 *
 * @public
 */
export type PlanInboxClaimFn = (
  target: PlanInboxClaimTarget,
) => Promise<readonly PlanInboxMessage[] | null>;

const toMessage = (value: unknown): PlanInboxMessage | null => {
  if (!isRecord(value)) return null;
  const { author, body, id, kind } = value;
  if (
    typeof author !== 'string' ||
    typeof body !== 'string' ||
    typeof id !== 'string' ||
    typeof kind !== 'string'
  ) {
    return null;
  }
  return { author, body, id, kind };
};

/**
 * Claim every pending message on a plan. Anything short of a clean answer (no
 * endpoint, network failure, timeout, server error, malformed result) is null.
 * Never throws.
 *
 * @public
 */
export const claimPlanInbox = async ({
  authToken,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  target,
  timeoutMs,
}: {
  readonly authToken: string;
  readonly fetchImpl?: HookFetch;
  readonly graphqlUrl: string | null;
  readonly target: PlanInboxClaimTarget;
  readonly timeoutMs: number;
}): Promise<readonly PlanInboxMessage[] | null> => {
  try {
    const input: Record<string, string> = { planId: target.planId };
    if (target.planRunId !== null) input.planRunId = target.planRunId;
    if (target.taskId !== null) input.taskId = target.taskId;
    const posted = await postGraphqlMutationNode({
      authToken,
      fetchImpl,
      field: 'claimPlanMessages',
      graphqlUrl,
      query: CLAIM_MUTATION,
      timeoutMs,
      variables: { input },
    });
    if (!posted.ok) {
      logHookError('plan-inbox: claim failed', posted.reason);
      return null;
    }
    const { messages } = posted.node;
    if (!Array.isArray(messages)) return null;
    return messages.flatMap((message): PlanInboxMessage[] => {
      const parsed = toMessage(message);
      return parsed === null ? [] : [parsed];
    });
  } catch (err) {
    logHookError('plan-inbox: claim threw', err);
    return null;
  }
};

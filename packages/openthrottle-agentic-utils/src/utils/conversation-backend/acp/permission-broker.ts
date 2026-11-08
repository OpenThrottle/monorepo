/**
 * Rendezvous between an ACP `session/request_permission` (the agent blocks
 * until the client answers) and a human's decision arriving later through the
 * `respondToConversationPermission` mutation.
 *
 * The registry is module-level and in-memory: it assumes the process that runs
 * the turn is the process that receives the mutation (a single server process).
 * A multi-instance deployment would need to route the answer to the owning
 * instance, or move this state into a shared store.
 */

import type { RequestPermissionResponse } from '@agentclientprotocol/sdk';

const CANCELLED: RequestPermissionResponse = {
  outcome: { outcome: 'cancelled' },
};

const pending = new Map<
  string,
  (response: RequestPermissionResponse) => void
>();

/**
 * Wait for a human to answer permission request `requestId`. Settles as
 * cancelled when `signal` aborts (the turn was cancelled), so a pending request
 * never outlives its turn.
 */
export function awaitAcpPermission(
  requestId: string,
  signal: AbortSignal | undefined,
): Promise<RequestPermissionResponse> {
  return new Promise<RequestPermissionResponse>((resolve) => {
    const settle = (response: RequestPermissionResponse): void => {
      signal?.removeEventListener('abort', onAbort);
      pending.delete(requestId);
      resolve(response);
    };
    const onAbort = (): void => {
      settle(CANCELLED);
    };

    pending.set(requestId, settle);
    if (signal?.aborted === true) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Answer a pending permission request: `optionId` selects one of the options
 * the agent offered, `null` cancels. Returns false for an unknown or already
 * settled id.
 *
 * @public
 */
export function resolveAcpPermission(
  requestId: string,
  optionId: string | null,
): boolean {
  const settle = pending.get(requestId);
  if (settle === undefined) {
    return false;
  }

  settle(
    optionId === null
      ? CANCELLED
      : { outcome: { optionId, outcome: 'selected' } },
  );
  return true;
}

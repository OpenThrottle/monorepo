/**
 * ACP permission handling. Answers `session/request_permission` requests from the composer's
 * permission posture, with no human in the loop. This mirrors the headless CLI
 * adapters exactly — every mode still allows the injected managed MCP servers,
 * `fullAccess` allows everything, `autoAcceptEdits` also allows edits — so
 * routing a backend through ACP never widens or narrows what a turn may do.
 *
 * `supervised` is the exception: acp.ts does not call this for it (managed MCP
 * tools aside) but surfaces the request in chat as a `permission_request` chunk
 * and waits for a human via the permission broker. This function still answers
 * `supervised` like the no-mode default for managed servers.
 *
 * Whether a request is raised at all is the agent's call, and it varies by
 * agent and mode: cursor's `agent` mode applies file edits without asking and
 * asks only for MCP tools.
 */

import type {
  PermissionOptionKind,
  RequestPermissionRequest,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';

import {
  CONVERSATION_PERMISSION_MODES,
  type ConversationPermissionMode,
} from '../types.ts';

/** Tool kinds `autoAcceptEdits` allows without asking. */
const EDIT_TOOL_KINDS: ReadonlySet<string> = new Set([
  'delete',
  'edit',
  'move',
  'read',
  'search',
]);

/**
 * True when the tool belongs to one of the run's managed MCP servers. ACP has
 * no structured server field on a permission request, so this matches the
 * agent's title, which leads with the server name (cursor:
 * `ot-echo-ot_echo: ot_echo`).
 */
export function isManagedMcpTool(
  title: string | null | undefined,
  managedServerNames: readonly string[],
): boolean {
  if (title === null || title === undefined) {
    return false;
  }

  return managedServerNames.some((name) => title.startsWith(name));
}

/** Pick the option of the wanted kind; `cancelled` when the agent offered none. */
function select(
  request: RequestPermissionRequest,
  kind: PermissionOptionKind,
): RequestPermissionResponse {
  const option = request.options.find((candidate) => candidate.kind === kind);
  if (option === undefined) {
    return { outcome: { outcome: 'cancelled' } };
  }

  return { outcome: { optionId: option.optionId, outcome: 'selected' } };
}

/**
 * Decide a permission request for a run. Grants are always `allow_once`, never
 * `allow_always`, so a turn can never persist a grant into the agent's config.
 *
 * @public
 */
export function decideAcpPermission(
  request: RequestPermissionRequest,
  permissionMode: ConversationPermissionMode | undefined,
  managedServerNames: readonly string[],
): RequestPermissionResponse {
  if (permissionMode === CONVERSATION_PERMISSION_MODES.fullAccess) {
    return select(request, 'allow_once');
  }

  if (isManagedMcpTool(request.toolCall.title, managedServerNames)) {
    return select(request, 'allow_once');
  }

  const kind = request.toolCall.kind ?? 'other';
  const allowEdits =
    permissionMode === CONVERSATION_PERMISSION_MODES.autoAcceptEdits;
  if (allowEdits && EDIT_TOOL_KINDS.has(kind)) {
    return select(request, 'allow_once');
  }

  return select(request, 'reject_once');
}

/**
 * Broker: rendezvous between an ACP `session/request_permission` (the agent blocks
 * until the client answers) and a human's decision arriving later through the
 * `respondToConversationPermission` mutation.
 *
 * The registry is module-level and in-memory: it assumes the process that runs
 * the turn is the process that receives the mutation (a single server process).
 * A multi-instance deployment would need to route the answer to the owning
 * instance, or move this state into a shared store.
 */

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

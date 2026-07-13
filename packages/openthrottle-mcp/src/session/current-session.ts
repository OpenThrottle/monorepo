/**
 * @description Lazily-opened work-ledger session for the MCP process (design §4.2).
 * Opened on the first mutating work-ledger tool call and reused for the rest of the
 * connection, so an agent's self-reported artifacts group under one session.
 *
 * State is a process-level singleton. The stdio server is one process per client
 * connection (run-server.ts), so this maps to one session per connection. For the
 * embedded/multiplexed Nest path this would over-share — tracked in the propagation
 * follow-up (per-connection scoping there should use AsyncLocalStorage).
 *
 * clientInfo-derived tool_name and a GITHUB_USER→users.id on_behalf_of hint are not
 * wired in the MCP yet (clientInfo isn't captured; on_behalf_of expects a user id, not
 * a GitHub handle) — deferred to the propagation follow-up. tool_name is static for now.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { StartWorkSessionDocument } from '../__generated__/graphql.js';
import { SERVER_VERSION } from '../config/index.ts';

const MCP_TOOL_NAME = 'openthrottle-mcp';

let currentSessionId: string | null = null;
let openingPromise: Promise<string | null> | null = null;

function resolveExternalRef(): string {
  const worktreeId = process.env.WORKTREE_ID;
  const base =
    worktreeId != null && worktreeId !== '' ? worktreeId : MCP_TOOL_NAME;
  return `${base}:${process.pid}`;
}

/**
 * @description Returns the current work-ledger session id, opening one on first call.
 * Concurrent callers share a single in-flight open. Returns null if opening fails
 * (best-effort — the caller decides whether that is fatal for its operation).
 */
export async function ensureWorkSession(token: string): Promise<string | null> {
  if (currentSessionId != null) return currentSessionId;
  if (openingPromise != null) return openingPromise;

  openingPromise = executeGraphqlWithAuth(token, StartWorkSessionDocument, {
    input: {
      externalRef: resolveExternalRef(),
      toolName: MCP_TOOL_NAME,
      toolVersion: SERVER_VERSION,
    },
  })
    .then((result) => {
      currentSessionId = result?.startWorkSession?.id ?? null;
      return currentSessionId;
    })
    .catch(() => null)
    .finally(() => {
      openingPromise = null;
    });

  return openingPromise;
}

/** @description The current session id, or null if none has been opened. */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

/** @description Forgets the current session (after endWorkSession). */
export function clearCurrentSession(): void {
  currentSessionId = null;
}

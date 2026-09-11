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
 * tool_name/tool_version are the connected client's own (see ../config/client-identity.ts),
 * falling back to this server's identity when the handshake gave none — a session that says
 * `claude-code` is worth far more to a reviewer than one that says `openthrottle-mcp`. The model
 * is whatever the caller declares for this session's work, else OPENTHROTTLE_MCP_MODEL, else
 * null; it is never inferred.
 *
 * A session's model is fixed when the row is INSERTed: `work_sessions` is append-only (only
 * ended_at/closed_by mutate afterwards), and no mutation can change a model. So attributing
 * different models to different tasks means one session per task — hence
 * {@link closeCurrentSession}, which lets a caller rotate at a task boundary. See
 * docs/openthrottle/per-task-model-attribution.md.
 *
 * A GITHUB_USER→users.id on_behalf_of hint is still not wired in (on_behalf_of expects a user id,
 * not a GitHub handle) — deferred to the propagation follow-up.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type { EndWorkSessionMutation } from '../__generated__/graphql.js';
import {
  EndWorkSessionDocument,
  StartWorkSessionDocument,
} from '../__generated__/graphql.js';
import { SERVER_VERSION } from '../config/index.ts';
import {
  resolveSessionModel,
  resolveSessionToolName,
  resolveSessionToolVersion,
} from '../config/client-identity.ts';

const MCP_TOOL_NAME = 'openthrottle-mcp';

let currentSessionId: string | null = null;
let openingPromise: Promise<string | null> | null = null;
let sessionMutex: Promise<unknown> = Promise.resolve();

/**
 * @description Serializes session lifecycle transitions (close, rotate).
 *
 * Without it two concurrent rotations both observe "nothing open yet" — or both adopt the same
 * in-flight lazy open — and collapse onto ONE session, which then carries ONE model for two
 * tasks while each caller is told its own model was recorded. That is a wrong value in a
 * provenance column reported as a right one, the exact failure the attribution design forbids,
 * so rotation has to be atomic rather than best-effort. Observed for real before this existed.
 *
 * The chain absorbs rejections so one failed transition cannot wedge every later one.
 */
function withSessionLock<T>(work: () => Promise<T>): Promise<T> {
  const settled = sessionMutex.then(work, work);
  sessionMutex = settled.then(
    () => undefined,
    () => undefined,
  );
  return settled;
}

function resolveExternalRef(): string {
  const worktreeId = process.env.WORKTREE_ID;
  const base =
    worktreeId != null && worktreeId !== '' ? worktreeId : MCP_TOOL_NAME;
  return `${base}:${process.pid}`;
}

/**
 * @description The `X-OT-Session-Id` header, so server-side side effects of a mutation attribute
 * to the session that caused them. Defined here because the header names this module's state.
 */
export const sessionHeaders = (
  sessionId: string,
): { headers: Record<string, string> } => ({
  headers: { 'X-OT-Session-Id': sessionId },
});

/** @description Options for opening a work session. */
interface EnsureWorkSessionOptions {
  /**
   * The model that did (or is doing) the work this session will record, declared by the caller.
   * Wins over OPENTHROTTLE_MCP_MODEL. Ignored when a session is already open or an open is in
   * flight, because a session's model is fixed at INSERT — rotate with
   * {@link closeCurrentSession} to record a different one.
   */
  readonly model?: string | null;
}

/**
 * @description Returns the current work-ledger session id, opening one on first call.
 * Concurrent callers share a single in-flight open. Returns null if opening fails
 * (best-effort — the caller decides whether that is fatal for its operation).
 */
export async function ensureWorkSession(
  token: string,
  options?: EnsureWorkSessionOptions,
): Promise<string | null> {
  if (currentSessionId != null) return currentSessionId;
  if (openingPromise != null) return openingPromise;

  openingPromise = executeGraphqlWithAuth(token, StartWorkSessionDocument, {
    input: {
      externalRef: resolveExternalRef(),
      model: resolveSessionModel(options?.model),
      toolName: resolveSessionToolName(),
      toolVersion: resolveSessionToolVersion(SERVER_VERSION),
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

/** @description What {@link closeCurrentSession} closed. */
interface ClosedSession {
  readonly session: EndWorkSessionMutation['endWorkSession'];
  readonly sessionId: string;
}

/**
 * @description Closes the open session, assuming the caller already holds the session lock.
 *
 * The local id is dropped *before* the mutation is awaited, and stays dropped even if it fails.
 * That is deliberate: this process is done with the session either way, and holding onto it would
 * attribute the next task's work to the previous task's session. A row left open server-side is
 * the strictly lesser problem, and is exactly what the sweeper's `closed_by = 'sweeper'` is for.
 */
async function closeCurrentSessionUnlocked(
  token: string,
  summary?: string | null,
): Promise<ClosedSession | null> {
  const sessionId = currentSessionId;
  if (sessionId == null) return null;

  clearCurrentSession();

  const result = await executeGraphqlWithAuth(
    token,
    EndWorkSessionDocument,
    { input: { sessionId, summary: summary ?? null } },
    sessionHeaders(sessionId),
  );

  return { session: result?.endWorkSession ?? null, sessionId };
}

/**
 * @description Closes the open session and forgets it, so the next mutating call opens a fresh
 * one. Returns null — sending nothing — when no session was open.
 */
export function closeCurrentSession(
  token: string,
  summary?: string | null,
): Promise<ClosedSession | null> {
  return withSessionLock(() => closeCurrentSessionUnlocked(token, summary));
}

/** @description Opens a session unconditionally, bypassing the lazy shared-open path. */
async function startSession(
  token: string,
  model?: string | null,
): Promise<string | null> {
  return executeGraphqlWithAuth(token, StartWorkSessionDocument, {
    input: {
      externalRef: resolveExternalRef(),
      model: resolveSessionModel(model),
      toolName: resolveSessionToolName(),
      toolVersion: resolveSessionToolVersion(SERVER_VERSION),
    },
  })
    .then((result) => result?.startWorkSession?.id ?? null)
    .catch(() => null);
}

/** @description Options for rotating to a session scoped to one unit of work. */
interface BeginScopedSessionOptions {
  /** The model that does this unit's work, declared by the caller. */
  readonly model?: string | null;
  /** Summary recorded on the session being closed, if any. */
  readonly summary?: string | null;
}

/**
 * @description Closes whatever session is open and opens a fresh one for the caller's declared
 * model, returning its id (null if opening failed). Atomic with respect to other lifecycle
 * transitions, so concurrent rotations produce distinct sessions rather than sharing one.
 *
 * Deliberately does NOT reuse {@link ensureWorkSession}: that function's whole job is to share an
 * open, which is precisely what must not happen here — a shared open means a shared model.
 */
export function beginScopedSession(
  token: string,
  options?: BeginScopedSessionOptions,
): Promise<string | null> {
  return withSessionLock(async () => {
    // Settle any lazily-started open first, or it would be adopted as this unit's session and
    // bring the previous caller's model with it.
    if (openingPromise != null) {
      await openingPromise.catch(() => null);
    }

    await closeCurrentSessionUnlocked(token, options?.summary).catch(
      () => null,
    );

    currentSessionId = await startSession(token, options?.model);
    return currentSessionId;
  });
}

/** @description The current session id, or null if none has been opened. */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

/** @description Forgets the current session (after endWorkSession). */
export function clearCurrentSession(): void {
  currentSessionId = null;
}

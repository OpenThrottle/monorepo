/**
 * @description Ambient work-session propagation for MCP tool calls.
 *
 * The MCP already holds ONE long-lived work session per connection
 * (see ./current-session.ts). The server's work-ledger capture path attributes a
 * status_change to that session when the request carries `X-OT-Session-Id`, and otherwise
 * opens a fresh instant session — one with no span at all.
 *
 * Only the work-ledger tools ever sent the header, so every plan/task mutation an agent
 * made fell through to the instant branch: a week of real use produced 435 zero-duration
 * sessions against 1 with a span. The session existed the whole time; nobody told the
 * server about it. These helpers are how a mutating tool tells it.
 *
 * Reads deliberately do not use this: a query should never manufacture a session, and a
 * session that exists only because something was read is not a unit of work.
 *
 * @see docs/monorepo/work-ledger-sessions.md
 */

import { ensureWorkSession } from './current-session.ts';

interface SessionHeaderOptions {
  readonly headers?: Record<string, string>;
}

/** @description GraphQL call options carrying an explicit session id. */
export function sessionHeaders(sessionId: string): SessionHeaderOptions {
  return { headers: { 'X-OT-Session-Id': sessionId } };
}

/**
 * @description Call options carrying the connection's ambient work session, opening one on
 * first use so the mutations of a single agent run group under a single span.
 *
 * Best-effort by design: if the session cannot be opened, this returns empty options and the
 * mutation proceeds unattributed. Ledger attribution is a nicety layered on the caller's
 * actual work — it must never be the reason that work fails.
 */
export async function ambientSessionOptions(
  token: string,
): Promise<SessionHeaderOptions> {
  const sessionId = await ensureWorkSession(token);
  return sessionId == null ? {} : sessionHeaders(sessionId);
}

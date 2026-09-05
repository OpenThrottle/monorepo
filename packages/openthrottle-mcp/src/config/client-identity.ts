/**
 * @description Who is on the other end of this MCP connection, for work-ledger attribution.
 *
 * A work session that records `toolName: 'openthrottle-mcp'` tells a reviewer nothing — every
 * session says that. One that records `claude-code` or `cursor` tells them which agent did the
 * work. The MCP initialize handshake carries exactly that in the client's `Implementation`, so
 * this module makes it reachable from the session opener.
 *
 * Why a captured *provider* rather than a captured value: `getClientVersion()` returns undefined
 * until initialize completes, which is after `connect()` returns. Sessions open lazily on the
 * first mutating tool call — long after — so reading through a callback at that moment gets the
 * real client, where reading eagerly at startup would always get undefined.
 *
 * Same surface split as {@link ./workspace-path.ts}: only the stdio entry point captures, so the
 * Nest/HTTP surface (which runs inside the OpenThrottle server, multiplexing many callers over one
 * process) resolves to the static fallbacks and reports no client at all rather than a wrong one.
 */

const MCP_TOOL_NAME = 'openthrottle-mcp';

type ClientIdentity = { name: string; version: string };

let clientIdentityProvider: (() => ClientIdentity | null) | null = null;

/**
 * @description Registers how to read the connected client's identity. Pass null to clear it.
 * The provider is called at session-open time, not here.
 */
export const captureClientIdentityProvider = (
  provider: (() => ClientIdentity | null) | null,
): void => {
  clientIdentityProvider = provider;
};

/**
 * @description The connected client's identity, or null when none was captured (the HTTP surface)
 * or the handshake has not completed. Never throws — attribution is best-effort and must not be
 * able to fail a tool call.
 */
export const getClientIdentity = (): ClientIdentity | null => {
  if (clientIdentityProvider == null) return null;

  try {
    const identity = clientIdentityProvider();
    return identity != null && identity.name.trim() !== '' ? identity : null;
  } catch {
    return null;
  }
};

/**
 * @description `toolName` for a new work session: the connected client's name when the handshake
 * gave one, else this server's own name.
 */
export const resolveSessionToolName = (): string =>
  getClientIdentity()?.name ?? MCP_TOOL_NAME;

/**
 * @description `toolVersion` for a new work session: the connected client's version when known,
 * else the fallback (this server's version) so the field is never empty.
 */
export const resolveSessionToolVersion = (fallback: string): string =>
  getClientIdentity()?.version ?? fallback;

/**
 * @description `model` for a new work session, or null.
 *
 * The MCP handshake does not carry a model — a client reports what it *is*, not which model is
 * driving it — so the only honest channel is an explicit `OPENTHROTTLE_MCP_MODEL` set by whatever
 * launched the server. When it is unset the session records null, and a review reports model
 * attribution as "not observable" rather than acting on a guess. Do not infer one.
 */
export const resolveSessionModel = (): string | null => {
  const model = process.env.OPENTHROTTLE_MCP_MODEL?.trim() ?? '';
  return model !== '' ? model : null;
};

import type { ServerHealth } from '../../bridge/types/shell-bridge.ts';
import { SERVER_HEALTH_QUERY } from '../data/data.settings.ts';

export type ProbeOtServerResult =
  | { readonly health: ServerHealth; readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export interface ProbeOtServerOptions {
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  readonly timeoutMs: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readHealth = (body: unknown): ServerHealth | undefined => {
  if (!isRecord(body) || !isRecord(body['data'])) {
    return undefined;
  }

  const health = body['data']['serverHealth'];

  if (!isRecord(health)) {
    return undefined;
  }

  const { api, database, redis, websocket } = health;

  if (
    typeof api === 'string' &&
    typeof database === 'string' &&
    typeof redis === 'string' &&
    typeof websocket === 'string'
  ) {
    return { api, database, redis, websocket };
  }

  return undefined;
};

const describeFailure = (error: unknown): string => {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'The server did not answer in time.';
  }

  const cause = error instanceof Error ? error.cause : undefined;
  const detail = cause instanceof Error ? cause.message : undefined;

  return detail === undefined
    ? 'Could not reach the server.'
    : `Could not reach the server (${detail}).`;
};

/**
 * @description Asks an OpenThrottle server whether it is alive by POSTing the
 * `serverHealth` query to `<server>/graphql`. It is the authoritative check:
 * only a GraphQL answer with `api: "ok"` counts, so a random web server on the
 * same port is not mistaken for an OT server. Runs in main (Node), never in
 * the page; `serverUrl` must already be a normalized origin.
 */
export const probeOtServer = async (
  serverUrl: string,
  options: ProbeOtServerOptions,
): Promise<ProbeOtServerResult> => {
  const { fetch, timeoutMs } = options;

  try {
    const response = await fetch(`${serverUrl}/graphql`, {
      body: JSON.stringify({ query: SERVER_HEALTH_QUERY }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: `The server answered ${response.status}; is this an OpenThrottle server?`,
      };
    }

    const health = readHealth(await response.json());

    if (health === undefined) {
      return {
        ok: false,
        reason: 'The address answered, but not like an OpenThrottle server.',
      };
    }

    if (health.api !== 'ok') {
      return {
        ok: false,
        reason: `The server reports its API as ${health.api}.`,
      };
    }

    return { health, ok: true };
  } catch (error) {
    return { ok: false, reason: describeFailure(error) };
  }
};

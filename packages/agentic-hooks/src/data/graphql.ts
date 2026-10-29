/**
 * One POST-a-mutation path shared by every telemetry stream (skill events,
 * skill outcomes, token usage), so failure classification lives in one place.
 *
 * Every failure is classified PERMANENT or TRANSIENT. A permanent failure is
 * the server saying "this payload is wrong" — re-sending the same bytes can
 * never succeed, so the drain moves it to dead-letter instead of retrying it
 * forever. Everything else (network, timeout, 5xx, auth, a missing endpoint)
 * is transient: fixing the environment makes the same line deliverable.
 *
 * Auth failures are deliberately TRANSIENT. A missing or expired token is an
 * environment problem, and dead-lettering on it would discard every line
 * buffered while the token was wrong.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import type { HookFetch, PostResult } from '../types.ts';

/** Apollo / Nest codes meaning the payload itself was rejected. */
const PERMANENT_GRAPHQL_CODES: readonly string[] = [
  'BAD_REQUEST',
  'BAD_USER_INPUT',
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
];

/** 4xx statuses that are about the environment, not the payload. */
const TRANSIENT_CLIENT_STATUSES: readonly number[] = [401, 403, 408, 429];

/**
 * True for a 4xx that re-sending cannot fix.
 *
 * @public
 */
export const isPermanentHttpStatus = (status: number): boolean =>
  status >= 400 && status < 500 && !TRANSIENT_CLIENT_STATUSES.includes(status);

const readStatusCode = (extensions: Record<string, unknown>): number | null => {
  const original = extensions.originalError;
  if (isRecord(original) && typeof original.statusCode === 'number') {
    return original.statusCode;
  }
  return null;
};

/**
 * Read GraphQL `errors` from a JSON payload: null when there are none, else the
 * joined messages and whether ANY of them is a permanent rejection.
 *
 * @public
 */
export const readGraphqlErrors = (
  payload: unknown,
): { message: string; permanent: boolean } | null => {
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.errors) ||
    !payload.errors.length
  ) {
    return null;
  }

  let permanent = false;
  const messages: string[] = [];
  for (const error of payload.errors) {
    if (!isRecord(error)) {
      continue;
    }
    messages.push(typeof error.message === 'string' ? error.message : '');
    const extensions = isRecord(error.extensions) ? error.extensions : {};
    const code = typeof extensions.code === 'string' ? extensions.code : '';
    const status = readStatusCode(extensions);
    if (
      PERMANENT_GRAPHQL_CODES.includes(code) ||
      (status !== null && isPermanentHttpStatus(status))
    ) {
      permanent = true;
    }
  }

  return { message: messages.join('; '), permanent };
};

/** Read `data.<field>.id` from a JSON payload, or null when absent. */
const readMutationId = (payload: unknown, field: string): string | null => {
  if (isRecord(payload) && isRecord(payload.data)) {
    const node = payload.data[field];
    if (isRecord(node) && node.id != null) {
      return String(node.id);
    }
  }
  return null;
};

const transient = (reason: string): PostResult => ({
  ok: false,
  permanent: false,
  reason,
});

/**
 * POST one mutation and read `data.<field>.id`. Never throws.
 *
 * @public
 */
export const postGraphqlMutation = async ({
  authToken,
  fetchImpl,
  field,
  graphqlUrl,
  query,
  timeoutMs,
  variables,
}: {
  authToken: string;
  fetchImpl: HookFetch;
  field: string;
  graphqlUrl: string | null;
  query: string;
  timeoutMs: number;
  variables: Record<string, unknown>;
}): Promise<PostResult> => {
  if (typeof fetchImpl !== 'function') {
    return transient('fetch unavailable');
  }
  if (!graphqlUrl) {
    return transient('missing graphql url');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response;
  try {
    response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({ query, variables }),
      headers,
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === 'TimeoutError'
        ? 'timeout'
        : err instanceof Error
          ? err.message
          : String(err);
    return transient(reason);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    // A proxy's HTML error page lands here; its status says whose fault it is.
    return {
      ok: false,
      permanent: isPermanentHttpStatus(response.status),
      reason: `invalid json (${response.status}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  const errors = readGraphqlErrors(payload);
  if (errors !== null) {
    return { ok: false, permanent: errors.permanent, reason: errors.message };
  }

  if (!response.ok) {
    return {
      ok: false,
      permanent: isPermanentHttpStatus(response.status),
      reason: `http ${response.status}`,
    };
  }

  const id = readMutationId(payload, field);
  if (!id) {
    return transient(`missing ${field}.id`);
  }

  return { id, ok: true };
};

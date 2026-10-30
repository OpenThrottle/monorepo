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

import type { HookFetch, PostFailure, PostResult } from '../types.ts';

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

/** Read `data.<field>` from a JSON payload (undefined when absent). */
const readMutationData = (payload: unknown, field: string): unknown =>
  isRecord(payload) && isRecord(payload.data) ? payload.data[field] : undefined;

const transient = (reason: string): PostFailure => ({
  ok: false,
  permanent: false,
  reason,
});

/**
 * The arguments every mutation POST takes.
 *
 * @public
 */
export interface PostMutationArgs {
  authToken: string;
  fetchImpl: HookFetch;
  field: string;
  graphqlUrl: string | null;
  query: string;
  timeoutMs: number;
  variables: Record<string, unknown>;
}

/**
 * The mutation POST every stream shares: transport, timeout, and the one
 * failure classification. On success it hands back `data.<field>` unread, so a
 * caller picks the shape it needs (an id, a counts object).
 */
const postMutation = async ({
  authToken,
  fetchImpl,
  graphqlUrl,
  query,
  timeoutMs,
  variables,
  field,
}: PostMutationArgs): Promise<PostFailure | { data: unknown; ok: true }> => {
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

  return { data: readMutationData(payload, field), ok: true };
};

/**
 * POST one mutation and read `data.<field>.id`. Never throws.
 *
 * @public
 */
export const postGraphqlMutation = async (
  args: PostMutationArgs,
): Promise<PostResult> => {
  const posted = await postMutation(args);
  if (!posted.ok) {
    return posted;
  }

  const node = posted.data;
  if (isRecord(node) && node.id != null && String(node.id)) {
    return { id: String(node.id), ok: true };
  }

  return transient(`missing ${args.field}.id`);
};

/**
 * POST one mutation and return the parsed `data.<field>` object — for
 * mutations that report counts rather than an id. Same failure classification
 * as `postGraphqlMutation`; a success whose field is not an object is a
 * transient failure. Never throws.
 *
 * @public
 */
export const postGraphqlMutationNode = async (
  args: PostMutationArgs,
): Promise<PostFailure | { node: Record<string, unknown>; ok: true }> => {
  const posted = await postMutation(args);
  if (!posted.ok) {
    return posted;
  }

  if (!isRecord(posted.data)) {
    return transient(`missing ${args.field}`);
  }

  return { node: posted.data, ok: true };
};

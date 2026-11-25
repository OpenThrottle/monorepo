/**
 * @description What every hosted embedding adapter shares (OT plan 7a18c91d): a JSON POST that
 * backs off on rate limits and transient server errors, and L2 normalisation so a vector cut
 * down to 768 dims scores the same under cosine and inner-product search.
 */

import { toErrorMessage } from '@openthrottle/nodejs-utils';

/** @description Attempts per request, the first included. */
export const HOSTED_EMBEDDING_MAX_ATTEMPTS = 4;

/** @description Backoff before retry n (1-based) is `base * 2^(n-1)`, unless Retry-After says otherwise. */
export const HOSTED_EMBEDDING_BACKOFF_BASE_MS = 500;

/** @description The longest a single backoff may wait, Retry-After included. */
export const HOSTED_EMBEDDING_BACKOFF_MAX_MS = 20_000;

export interface HostedJsonRequest {
  readonly body: unknown;
  readonly headers: Readonly<Record<string, string>>;
  /** Names the provider in every failure, e.g. `OpenAI text-embedding-3-small`. */
  readonly label: string;
  /** Overridable so tests do not wait out real backoff. */
  readonly sleep: (ms: number) => Promise<void>;
  readonly url: string;
}

export type HostedJsonResult =
  | { readonly data: unknown; readonly ok: true }
  | { readonly detail: string; readonly ok: false };

/** @description 429 and 5xx are worth another attempt; any other status will answer the same. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * @description Milliseconds to wait before retry `attempt` (1-based): the server's
 * `Retry-After` (seconds or an HTTP date) when it sent one, else exponential backoff, capped.
 */
export function backoffDelayMs(
  attempt: number,
  retryAfter: string | null,
  now: number = Date.now(),
): number {
  const exponential = HOSTED_EMBEDDING_BACKOFF_BASE_MS * 2 ** (attempt - 1);

  if (!retryAfter) {
    return Math.min(exponential, HOSTED_EMBEDDING_BACKOFF_MAX_MS);
  }

  const seconds = Number(retryAfter);
  const fromHeader = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(retryAfter) - now;
  const delay = Number.isFinite(fromHeader) ? fromHeader : exponential;

  return Math.min(Math.max(delay, 0), HOSTED_EMBEDDING_BACKOFF_MAX_MS);
}

/** @description First 300 characters of an error body; providers explain refusals there. */
async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();

    return text ? `: ${text.slice(0, 300)}` : '';
  } catch {
    return '';
  }
}

type AttemptOutcome =
  | { readonly kind: 'done'; readonly result: HostedJsonResult }
  | {
      readonly detail: string;
      readonly kind: 'retry';
      readonly retryAfter: string | null;
    };

async function attemptPost(
  request: HostedJsonRequest,
): Promise<AttemptOutcome> {
  try {
    const response = await fetch(request.url, {
      body: JSON.stringify(request.body),
      headers: { 'Content-Type': 'application/json', ...request.headers },
      method: 'POST',
    });

    if (response.ok) {
      return {
        kind: 'done',
        result: { data: await response.json(), ok: true },
      };
    }

    const detail = `${request.label} answered ${response.status}${await readErrorBody(response)}`;

    if (!isRetryableStatus(response.status)) {
      return { kind: 'done', result: { detail, ok: false } };
    }

    return {
      detail,
      kind: 'retry',
      retryAfter: response.headers.get('retry-after'),
    };
  } catch (error: unknown) {
    const message = toErrorMessage(error);

    return {
      detail: `${request.label} is unreachable: ${message}`,
      kind: 'retry',
      retryAfter: null,
    };
  }
}

/**
 * @description POSTs JSON, retrying 429/5xx and network errors up to
 * {@link HOSTED_EMBEDDING_MAX_ATTEMPTS} times. Never throws: every failure is a `detail` naming
 * the provider, the status and the provider's own message. The API key travels in `headers`
 * only, so it never appears in a `detail`.
 */
export async function postJsonWithRetry(
  request: HostedJsonRequest,
  attempt: number = 1,
): Promise<HostedJsonResult> {
  const outcome = await attemptPost(request);

  if (outcome.kind === 'done') {
    return outcome.result;
  }

  if (attempt >= HOSTED_EMBEDDING_MAX_ATTEMPTS) {
    return {
      detail: `${outcome.detail} (gave up after ${HOSTED_EMBEDDING_MAX_ATTEMPTS} attempts)`,
      ok: false,
    };
  }

  await request.sleep(backoffDelayMs(attempt, outcome.retryAfter));

  return postJsonWithRetry(request, attempt + 1);
}

/** @description True when `value` is an array of finite numbers. */
export function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((cell) => {
      return typeof cell === 'number' && Number.isFinite(cell);
    })
  );
}

/** @description Scales `vector` to unit length; a zero vector is returned unchanged. */
export function l2Normalize(vector: readonly number[]): number[] {
  const norm = Math.sqrt(
    vector.reduce((sum, value) => {
      return sum + value * value;
    }, 0),
  );

  if (norm === 0) {
    return [...vector];
  }

  return vector.map((value) => {
    return value / norm;
  });
}

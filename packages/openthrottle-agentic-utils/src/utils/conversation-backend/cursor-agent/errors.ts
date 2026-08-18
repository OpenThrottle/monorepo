/**
 * Classification for cursor-agent startup failures.
 *
 * Two consumers, deliberately sharing one classifier: the mint retry (only
 * retry what could plausibly succeed on a second attempt) and the composer copy
 * (tell the user which of these it is). A failure the user must fix — expired
 * login, missing binary — must never be retried, and must never be reported as
 * a transient blip.
 *
 * The patterns are taken from output captured off the real binary
 * (2026.08.11), not invented.
 */

/**
 * ANSI/VT control sequences (CSI, OSC, and single-char escapes).
 *
 * cursor writes its warnings decorated — the captured invalid-key stderr is
 * `\u001b[33m! Warning: …\u001b[0m` — and that text is forwarded verbatim into
 * the composer today, escapes and all.
 */
/* eslint-disable no-control-regex -- matching terminal escapes is the entire point */
const ANSI_PATTERN =
  /\u001b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g;
/* eslint-enable no-control-regex */

/**
 * Remove terminal escape sequences from text bound for a UI or a log.
 *
 * @public
 */
export function stripAnsi(text: string): string {
  ANSI_PATTERN.lastIndex = 0;
  return text.replace(ANSI_PATTERN, '');
}

/**
 * The failure kinds we can act on differently. Anything unrecognized is
 * `unknown`, which is treated as possibly-transient.
 *
 * @public
 */
export const CURSOR_FAILURE_KINDS = {
  /** Login expired or absent; the user must re-authenticate. */
  authRequired: 'authRequired',
  /** The `cursor-agent` binary is not on PATH. */
  notInstalled: 'notInstalled',
  /** The spawn exceeded its budget. */
  timeout: 'timeout',
  /** Unrecognized — assumed transient. */
  unknown: 'unknown',
} as const;

/**
 * One of {@link CURSOR_FAILURE_KINDS}.
 *
 * @public
 */
export type CursorFailureKind =
  (typeof CURSOR_FAILURE_KINDS)[keyof typeof CURSOR_FAILURE_KINDS];

/**
 * Binary missing. Node reports a failed spawn as ENOENT on the `error` event,
 * before any of our own message formatting runs.
 */
const NOT_INSTALLED_PATTERNS: readonly RegExp[] = [
  /\bENOENT\b/,
  /command not found/i,
  /no such file or directory/i,
];

/**
 * Auth. Covers cursor's own two messages —
 *   `Error: Authentication required. Please run 'agent login' first, …`
 *   `⚠ Warning: The provided API key is invalid.`
 * — plus the macOS keychain failures cursor maps from osStatus 36 / 44.
 */
const AUTH_REQUIRED_PATTERNS: readonly RegExp[] = [
  /authentication required/i,
  /\bplease run\b.*\blogin\b/i,
  /api key is invalid/i,
  /\bnot logged in\b/i,
  /\bunauthorized\b/i,
  /\b401\b/,
  /keychain/i,
  /errSec(?:InteractionNotAllowed|ItemNotFound)/i,
];

/** Our own timeout wording from the mint and the stream teardown. */
const TIMEOUT_PATTERNS: readonly RegExp[] = [/timed out/i, /\btimeout\b/i];

function matchesAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Classify a cursor failure from its message (which, via
 * `formatCursorMintFailure`, already carries the child's stderr).
 *
 * Order matters: `notInstalled` is checked first because an ENOENT message can
 * also mention a path, and `authRequired` before `timeout` because an auth
 * failure that also timed out is still the user's to fix.
 *
 * @public
 */
export function classifyCursorFailure(message: string): CursorFailureKind {
  if (matchesAny(message, NOT_INSTALLED_PATTERNS)) {
    return CURSOR_FAILURE_KINDS.notInstalled;
  }

  if (matchesAny(message, AUTH_REQUIRED_PATTERNS)) {
    return CURSOR_FAILURE_KINDS.authRequired;
  }

  if (matchesAny(message, TIMEOUT_PATTERNS)) {
    return CURSOR_FAILURE_KINDS.timeout;
  }

  return CURSOR_FAILURE_KINDS.unknown;
}

/**
 * Whether a second attempt could plausibly succeed.
 *
 * `unknown` is retryable on purpose: the cold-start failures this plan chased
 * are transient and do not match any pattern, and one extra spawn is cheap
 * next to a dead turn. Auth and missing-binary never are — retrying those just
 * doubles the wait before the user sees the message they need to act on.
 *
 * @public
 */
export function isRetryableCursorFailure(kind: CursorFailureKind): boolean {
  return (
    kind === CURSOR_FAILURE_KINDS.timeout ||
    kind === CURSOR_FAILURE_KINDS.unknown
  );
}

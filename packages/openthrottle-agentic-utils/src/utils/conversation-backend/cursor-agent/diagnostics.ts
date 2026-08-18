/**
 * Diagnostics for the cursor-agent spawns: bounded, escape-preserving renderings
 * of a child's stdout/stderr plus the redaction applied before any of it reaches
 * a log or an error message.
 *
 * Why this lives here and not in `nestjs-logging`: the mint error message is
 * composed inside this package (which must stay free of server dependencies),
 * so redaction has to happen at composition time. The server's own redactor
 * still runs at the JSONL chokepoint as defense-in-depth.
 */

/** Max characters kept from each captured stream; the rest is elided. */
export const MAX_CAPTURED_STREAM_CHARS = 2_048;

/** Written in place of anything that looks like a credential. */
const REDACTED = '[REDACTED]';

/**
 * Env vars whose *values* are redacted by literal match wherever they appear.
 * A child that echoes its own configuration must never leak the real token.
 */
const SECRET_ENV_KEYS = ['CURSOR_API_KEY', 'CURSOR_AUTH_TOKEN'] as const;

/**
 * Token-shaped value patterns, redacted regardless of surrounding context.
 * Deliberately conservative: a false positive costs a `[REDACTED]` in a log
 * line, a false negative leaks a credential.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
  // Authorization scheme + credential (Bearer/Basic/Digest/Token …).
  /\b(?:bearer|basic|digest|token)\s+[\w.\-+/=]+/gi,
  // JSON Web Token (three base64url segments).
  /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g,
  // cursor-style prefixed keys (`key_…`, `cur_…`, `sk-…`) with a long tail.
  /\b(?:key|cur|sk)[_-][A-Za-z0-9_-]{16,}/g,
];

/**
 * Redact credentials from text destined for a log or an error message.
 *
 * @public
 */
export function redactCursorSecrets(
  text: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  let result = text;

  // Literal env values first: a real token may not match any generic pattern.
  for (const key of SECRET_ENV_KEYS) {
    const value = env[key];
    if (value !== undefined && value.trim() !== '') {
      result = result.split(value).join(REDACTED);
    }
  }

  for (const pattern of SECRET_PATTERNS) {
    // Reset stateful (global) regexes so reuse across calls is deterministic.
    if (pattern.global) {
      pattern.lastIndex = 0;
    }
    result = result.replace(pattern, REDACTED);
  }

  return result;
}

/**
 * Render a captured stream for a log line: redacted, truncated, and
 * JSON-escaped so ANSI sequences, BOMs, and CRLFs stay visible instead of
 * being swallowed by the terminal that prints the log.
 *
 * @public
 */
export function describeCapturedStream(
  raw: string,
  limit: number = MAX_CAPTURED_STREAM_CHARS,
): string {
  if (raw === '') {
    return '<empty>';
  }

  const redacted = redactCursorSecrets(raw);
  const kept = redacted.slice(0, limit);
  const elided = redacted.length - kept.length;

  return elided > 0
    ? `${JSON.stringify(kept)} …(+${elided} chars elided)`
    : JSON.stringify(kept);
}

/**
 * Everything known about a failed `cursor-agent create-chat` spawn.
 */
export interface CursorMintFailureDetails {
  /** Resolved binary path (env override or the PATH-looked-up name). */
  readonly bin: string;
  /** Workspace directory the mint ran in. */
  readonly cwd: string;
  /** Wall-clock duration of the spawn, in ms. */
  readonly elapsedMs: number;
  /** What went wrong, e.g. `exited 1` or `timed out after 30000ms`. */
  readonly reason: string;
  /** Raw stderr captured from the child. */
  readonly stderr: string;
  /** Raw stdout captured from the child. */
  readonly stdout: string;
}

/**
 * Compose the single-line mint failure message. Always carries the evidence —
 * binary, cwd, duration, and BOTH streams — because a mint failure is otherwise
 * undiagnosable from server logs alone.
 *
 * @public
 */
export function formatCursorMintFailure(
  details: CursorMintFailureDetails,
): string {
  return [
    `cursor-agent create-chat ${details.reason}`,
    `bin=${details.bin}`,
    `cwd=${details.cwd}`,
    `elapsedMs=${details.elapsedMs}`,
    `stdout=${describeCapturedStream(details.stdout)}`,
    `stderr=${describeCapturedStream(details.stderr)}`,
  ].join(' ');
}

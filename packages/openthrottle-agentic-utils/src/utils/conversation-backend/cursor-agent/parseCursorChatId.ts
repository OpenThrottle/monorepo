import { stripAnsi } from './errors.ts';

/**
 * Parsing + validation for the chat id `cursor-agent create-chat` prints.
 *
 * Why this exists, given `create-chat` is observably clean today: `--resume`
 * accepts ANY string. A polluted id does not fail the turn — cursor silently
 * starts a *fresh, disconnected* chat and echoes the junk back as its
 * `session_id`. So a banner byte on stdout costs the conversation all of its
 * multi-turn context while every surface still reports success. Validating at
 * the mint is the only place that failure is visible.
 *
 * Shape: cursor's `handleCreateChat` mints the id with `crypto.randomUUID()`,
 * so a canonical UUID is the expected form. The matcher prefers a UUID but
 * falls back to a conservative single-token rule rather than hard-failing if a
 * future cursor release changes the format.
 */

/** Byte-order mark, which some CLIs emit ahead of their first write. */
const BOM = '\uFEFF';

/** Canonical UUID, any version — the shape cursor mints today. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fallback shape for a future cursor release that stops using UUIDs: a single
 * opaque token of plausible length. Deliberately loose on charset and strict on
 * "one token, no whitespace" — that is what actually separates an id from a
 * banner line like `Update available! 1.2.3`.
 */
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

/**
 * Normalize captured stdout: drop a leading BOM, strip ANSI escapes, and split
 * on LF/CRLF into trimmed, non-empty candidate lines.
 */
function toCandidateLines(stdout: string): string[] {
  const cleaned = stdout.startsWith(BOM) ? stdout.slice(BOM.length) : stdout;

  return stripAnsi(cleaned)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/**
 * True when a line is shaped like a cursor chat id.
 */
function looksLikeChatId(line: string): boolean {
  return UUID_PATTERN.test(line) || OPAQUE_TOKEN_PATTERN.test(line);
}

/**
 * Extract the chat id from `create-chat` stdout, or `null` when no line looks
 * like one.
 *
 * Prefers a UUID anywhere in the output; only if none is present does it fall
 * back to the opaque-token rule. Within each tier the **last** match wins,
 * because banners and notices print before the value.
 *
 * @public
 */
export function parseCursorChatId(stdout: string): string | null {
  const lines = toCandidateLines(stdout);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line !== undefined && UUID_PATTERN.test(line)) {
      return line;
    }
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line !== undefined && looksLikeChatId(line)) {
      return line;
    }
  }

  return null;
}

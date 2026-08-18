/**
 * User-facing copy for cursor-agent startup failures.
 *
 * This text is composed server-side rather than in the chat components because
 * that is where it is produced: a terminal error chunk reaches the UI as a
 * plain system-message body, with no typed field to branch on. Keeping it in a
 * dedicated module (rather than inline in the service) preserves the
 * copy-out-of-logic boundary, and keying it off the shared
 * `CURSOR_FAILURE_KINDS` means the copy and the retry policy can never disagree
 * about what a failure is.
 */

import {
  CURSOR_FAILURE_KINDS,
  type CursorFailureKind,
  classifyCursorFailure,
  stripAnsi,
} from '@openthrottle/openthrottle-agentic-utils';

/**
 * One sentence naming what happened, then one naming what to do about it.
 * Every entry has a concrete next step — "try again" is only acceptable where
 * trying again is genuinely the right move.
 */
const CURSOR_STARTUP_ERROR_COPY: Readonly<Record<CursorFailureKind, string>> = {
  [CURSOR_FAILURE_KINDS.authRequired]: `Your cursor-agent login has expired or is unavailable. Run \`cursor-agent login\` in a terminal, then send this message again.`,
  [CURSOR_FAILURE_KINDS.notInstalled]: `cursor-agent is not installed, or is not on this server’s PATH. Install it with \`curl https://cursor.com/install -fsS | bash\`, or set OPENTHROTTLE_CURSOR_AGENT_BIN to its full path.`,
  [CURSOR_FAILURE_KINDS.timeout]: `cursor-agent did not start in time. This is usually a cold start — send the message again and it will normally succeed.`,
  [CURSOR_FAILURE_KINDS.unknown]: `cursor-agent could not start this chat. Send the message again; if it keeps failing, check the server logs for the full cursor-agent output.`,
};

/**
 * How much of the raw failure to keep alongside the copy. Enough to recognize
 * the failure at a glance; the untruncated text is already in the server log.
 */
const MAX_RAW_DETAIL_CHARS = 300;

/**
 * Compose the terminal-chunk text for a cursor startup failure: actionable copy
 * for the classified kind, plus the raw message so a misclassification never
 * costs the user their only diagnostic.
 *
 * The raw text is ANSI-stripped — cursor decorates its warnings, and those
 * escapes were previously forwarded into the composer verbatim.
 */
export function composeCursorStartupErrorText(rawMessage: string): string {
  const cleaned = stripAnsi(rawMessage).trim();
  const copy = CURSOR_STARTUP_ERROR_COPY[classifyCursorFailure(cleaned)];

  if (cleaned === '') {
    return copy;
  }

  const detail =
    cleaned.length > MAX_RAW_DETAIL_CHARS
      ? `${cleaned.slice(0, MAX_RAW_DETAIL_CHARS)}…`
      : cleaned;

  return `${copy}\n\nDetails: ${detail}`;
}

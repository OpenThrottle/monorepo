import type { ChatFileMention } from './types';

/**
 * Marker character that opens a file mention in a composer draft. A mention
 * token is the plain text `@<workspace-relative/posix/path>`; v1 uses no
 * contenteditable chips, so the token lives as literal text in the draft.
 *
 * @public
 */
export const FILE_MENTION_TRIGGER = '@';

/**
 * Matches an `@`-mention token: an `@` at a token boundary — the start of the
 * string, or immediately after whitespace or a common opening delimiter — so
 * email locals like `user@host` never match, followed by a run of
 * non-whitespace, non-`@` path characters. The captured run still carries any
 * trailing sentence punctuation; {@link parseFileMentions} trims it via
 * {@link TRAILING_PUNCTUATION} so `@src/app.ts.` yields `src/app.ts` while the
 * internal `.ts` dot survives.
 */
const FILE_MENTION_PATTERN = /(?:^|[\s([{<"'`])@([^\s@]+)/g;

/** Trailing punctuation stripped from a captured token (sentence boundaries). */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>'"`]+$/;

/**
 * Extract the file mentions from a submitted message. Pure and transport-free:
 * it only reads the string, so a returned path is a *candidate* the caller must
 * still validate against the real workspace listing (see the developer app's
 * resolve-on-submit step). Whitespace terminates a token, so paths containing
 * spaces are not representable as a single mention in v1. Duplicate paths
 * collapse to the first occurrence, preserving order.
 *
 * @public
 */
export const parseFileMentions = (
  message: string,
): readonly ChatFileMention[] => {
  const seen = new Set<string>();
  const mentions: ChatFileMention[] = [];

  for (const match of message.matchAll(FILE_MENTION_PATTERN)) {
    const path = match[1].replace(TRAILING_PUNCTUATION, '');
    if (path === '' || seen.has(path)) {
      continue;
    }
    seen.add(path);
    mentions.push({ path });
  }

  return mentions;
};

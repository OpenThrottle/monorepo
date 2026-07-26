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

/** Characters that may precede `@` and still open a mention (token boundary). */
const MENTION_BOUNDARY_BEFORE = /[\s([{<"'`]/;

/**
 * The in-progress `@`-mention the caret currently sits inside, if any. Drives
 * the composer's mention popover.
 *
 * @public
 */
export interface ActiveFileMention {
  /** Index of the opening `@` in the draft string. */
  readonly anchor: number;
  /** Text typed after `@` up to the caret (the fuzzy-filter query). */
  readonly query: string;
}

/**
 * Detect the `@`-mention token the caret is inside, scanning back from `caret`
 * to the nearest `@` at a token boundary with no intervening whitespace. Returns
 * `null` when the caret is not inside a mention (e.g. after a space, or on an
 * email local-part like `user@host`). Pure — used by the composer to decide
 * whether to open the mention popover and what query to run.
 *
 * @public
 */
export const detectActiveMention = (
  value: string,
  caret: number,
): ActiveFileMention | null => {
  for (let i = caret - 1; i >= 0; i -= 1) {
    const ch = value[i];
    if (/\s/.test(ch)) {
      return null;
    }
    if (ch === FILE_MENTION_TRIGGER) {
      const before = i === 0 ? '' : value[i - 1];
      if (before === '' || MENTION_BOUNDARY_BEFORE.test(before)) {
        return { anchor: i, query: value.slice(i + 1, caret) };
      }
      return null;
    }
  }
  return null;
};

/**
 * Replace the in-progress `@query` (from `anchor` through `caret`) with the
 * chosen `@<path>` token plus a trailing space, returning the new draft and the
 * caret position after the inserted space. Pure — the composer applies the
 * caret to the textarea after re-render.
 *
 * @public
 */
export const insertFileMention = (
  value: string,
  anchor: number,
  caret: number,
  path: string,
): { readonly caret: number; readonly value: string } => {
  const token = `${FILE_MENTION_TRIGGER}${path} `;
  return {
    caret: anchor + token.length,
    value: value.slice(0, anchor) + token + value.slice(caret),
  };
};

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

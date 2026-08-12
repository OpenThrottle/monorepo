/**
 * Marker character that opens a slash command in a composer draft. A slash
 * command token is the plain text `/<slug>` at the start of a line, optionally
 * followed by whitespace-separated arguments (`/skills foo bar`).
 *
 * @public
 */
export const SLASH_COMMAND_TRIGGER = '/';

/**
 * Matches a submitted slash-command message: a leading `/`, a run of
 * non-whitespace as the slug, then optional whitespace-separated arguments.
 * Deliberately permissive on slug characters (kebab-case slugs, plugin-prefixed
 * `plugin:skill`, and namespaced `group:skill` slugs all pass through) — the
 * caller validates the slug against the real skill listing.
 */
const SLASH_COMMAND_PATTERN = /^\/(\S+)(?:\s+([\s\S]*))?$/;

/**
 * The in-progress slash command the caret currently sits inside, if any. Drives
 * the composer's slash-command popover.
 *
 * @public
 */
export interface ActiveSlashCommand {
  /** Index of the opening `/` in the draft string (always a line start). */
  readonly anchor: number;
  /** Text typed after `/` up to the caret (the fuzzy-filter query). */
  readonly query: string;
}

/**
 * A parsed slash command extracted from a submitted message: the `slug` (the
 * text between the leading `/` and the first whitespace) and the trailing
 * `args` (trimmed; empty string when none). Pure — a returned `slug` is a
 * *candidate* the caller must still validate against the real skill listing.
 *
 * @public
 */
export interface ParsedSlashCommand {
  /** Trailing arguments after the slug, trimmed; empty string when none. */
  readonly args: string;
  /** The command slug (e.g. `skills`, `vercel:ai-sdk`). */
  readonly slug: string;
}

/**
 * Detect the slash command the caret is inside, if any. Unlike the `@`-mention
 * detector — which scans back to the nearest token boundary anywhere in the
 * draft — a slash command is **anchored to the start of its line**: the `/`
 * must be the first character of the draft, or the first character after a
 * newline. So `/gra` triggers, `foo\n/gra` triggers on the second line, but a
 * mid-text `hi /x` does NOT (the `/` is not at a line start). The query runs
 * from just after `/` to the caret and must contain no whitespace — once a
 * space is typed the command name is complete and the caller is entering
 * arguments, so this returns `null`. Pure — used by the composer to decide
 * whether to open the slash-command popover and what query to run.
 *
 * @public
 */
export const detectActiveSlashCommand = (
  value: string,
  caret: number,
): ActiveSlashCommand | null => {
  // Start of the caret's current line: char after the last newline before the
  // caret, or 0 when the caret is on the first line.
  const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
  if (value[lineStart] !== SLASH_COMMAND_TRIGGER) {
    return null;
  }
  // Caret must sit after the opening `/`, inside the token.
  if (caret <= lineStart) {
    return null;
  }
  const query = value.slice(lineStart + 1, caret);
  if (/\s/.test(query)) {
    return null;
  }
  return { anchor: lineStart, query };
};

/**
 * Replace the in-progress `/query` (from `anchor` through `caret`) with the
 * chosen `/<slug> ` token plus a trailing space, returning the new draft and
 * the caret position after the inserted space. Pure — the composer applies the
 * caret to the textarea after re-render.
 *
 * @public
 */
export const insertSlashCommand = (
  value: string,
  anchor: number,
  caret: number,
  slug: string,
): { readonly caret: number; readonly value: string } => {
  const token = `${SLASH_COMMAND_TRIGGER}${slug} `;
  return {
    caret: anchor + token.length,
    value: value.slice(0, anchor) + token + value.slice(caret),
  };
};

/**
 * Extract a leading slash command from a submitted message: the `slug` and any
 * trailing `args`. Returns `null` when the message does not start with `/<slug>`
 * (a bare `/` with no slug included). Pure and transport-free — the returned
 * `slug` is a candidate the caller must still validate against the real skill
 * listing.
 *
 * @public
 */
export const parseSlashCommand = (
  message: string,
): ParsedSlashCommand | null => {
  const match = SLASH_COMMAND_PATTERN.exec(message);
  if (!match) {
    return null;
  }
  return { args: match[2]?.trim() ?? '', slug: match[1] };
};

/**
 * Shared recognition of OpenThrottle id input pasted into a command palette
 * (⌘K commander). Classifies a raw string as a full UUID, a short hex fragment
 * that "looks like an id prefix" (the leading hex of a UUID, e.g. `f5e40886`),
 * or neither. The fragment normalization here mirrors the server-side
 * `resolvePlanRef` prefix rules so the client gate and the backend lookup agree
 * on what is resolvable.
 */

/**
 * @public
 * @description Matches a full OpenThrottle / RFC UUID string.
 */
export const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @public
 * @description Minimum length of a normalized (hyphen-stripped) hex prefix
 * before it is treated as a resolvable id fragment. Matches the server's
 * `resolvePlanRef` threshold so the palette never fires a lookup the backend
 * would reject.
 */
export const MIN_ID_FRAGMENT_LENGTH = 6;

const REGEX_HEX_ONLY = /^[0-9a-f]+$/;

/**
 * @public
 * @description Classification of a raw command-palette id input.
 */
export const ID_INPUT_KIND = {
  FULL_UUID: 'full-uuid',
  NONE: 'none',
  SHORT_FRAGMENT: 'short-fragment',
} as const;

/**
 * @public
 */
export type IdInputKind = (typeof ID_INPUT_KIND)[keyof typeof ID_INPUT_KIND];

/**
 * @public
 * @description Normalize a raw id fragment for prefix matching: trim, lowercase,
 * strip hyphens. Returns the normalized hex string, or an empty string when the
 * result is too short or contains non-hex characters (i.e. not a resolvable
 * prefix). A full UUID normalizes to its 32 hex characters.
 */
export const normalizeIdFragment = (input: string): string => {
  const normalized = input.trim().toLowerCase().replace(/-/g, '');

  if (normalized.length < MIN_ID_FRAGMENT_LENGTH) {
    return '';
  }

  if (!REGEX_HEX_ONLY.test(normalized)) {
    return '';
  }

  return normalized;
};

/**
 * @public
 * @description True when the trimmed input is a complete UUID.
 */
export const isFullUuid = (input: string): boolean =>
  REGEX_UUID.test(input.trim());

/**
 * @public
 * @description True when the input looks like a short id prefix (resolvable hex
 * fragment) but is not a full UUID.
 */
export const isShortIdFragment = (input: string): boolean =>
  !isFullUuid(input) && normalizeIdFragment(input).length > 0;

/**
 * @public
 * @description Classify a raw command-palette id input as a full UUID, a short
 * resolvable hex fragment, or neither.
 */
export const classifyIdInput = (input: string): IdInputKind => {
  if (isFullUuid(input)) {
    return ID_INPUT_KIND.FULL_UUID;
  }

  if (normalizeIdFragment(input).length > 0) {
    return ID_INPUT_KIND.SHORT_FRAGMENT;
  }

  return ID_INPUT_KIND.NONE;
};

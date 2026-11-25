/**
 * @description cmdk keywords that mark the palette's no-match rows, so
 * `scoreCommanderRow` can rank them leading → Search → fallback.
 */
export const COMMANDER_ESCAPE_ROW_KEYWORD = {
  fallback: '__commander_escape_fallback__',
  leading: '__commander_escape_leading__',
  search: '__commander_escape_search__',
} as const;

export type CommanderEscapeRowKeywordKey =
  keyof typeof COMMANDER_ESCAPE_ROW_KEYWORD;
export type CommanderEscapeRowKeywordValue =
  (typeof COMMANDER_ESCAPE_ROW_KEYWORD)[CommanderEscapeRowKeywordKey];

/**
 * @description Palette row and group styling, shared by the navigation groups
 * and the no-match group so every row has the same height, padding and
 * full-bleed highlight.
 */
export const COMMANDER_CLASS_NAME = {
  group: 'm-0! p-0!',
  icon: 'h-3! w-3! shrink-0 opacity-80',
  row: 'm-0! h-auto! rounded-none! p-2! px-4!',
} as const;

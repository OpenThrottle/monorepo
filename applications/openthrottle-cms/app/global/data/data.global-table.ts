/**
 * @public
 * @description How {@link GlobalTable} renders a column's cells. A column declares its kind as
 * data, so a route's column config needs no render functions.
 */
export const GLOBAL_TABLE_COLUMN_KIND = {
  BADGE: 'badge',
  BOOLEAN: 'boolean',
  CODE: 'code',
  DATE: 'date',
  LIST: 'list',
  TEXT: 'text',
} as const;

/**
 * @public
 * @description Copy rendered by {@link GlobalTable}: the empty-table message and the placeholder
 * for a missing cell value.
 */
export const GLOBAL_TABLE_COPY = {
  empty: `Nothing here yet.`,
  missing: `—`,
  no: `No`,
  yes: `Yes`,
} as const;

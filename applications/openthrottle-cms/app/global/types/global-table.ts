import type { GLOBAL_TABLE_COLUMN_KIND } from '~/global/data/data.global-table';

/**
 * @public
 * @description One of the {@link GLOBAL_TABLE_COLUMN_KIND} values.
 */
export type GlobalTableColumnKind =
  (typeof GLOBAL_TABLE_COLUMN_KIND)[keyof typeof GLOBAL_TABLE_COLUMN_KIND];

/**
 * @public
 * @description A declarative `GlobalTable` column: which row field to read, its header, and how
 * to render it.
 */
export interface GlobalTableColumn<TRow extends object> {
  readonly header: string;
  readonly key: keyof TRow & string;
  readonly kind: GlobalTableColumnKind;
}

import type { GlobalTableColumnKind } from '~/global/types/global-table';

/**
 * @public
 * @description A declarative `GlobalDetailList` row: which record field to read, its label, and
 * how to render it (the same kinds `GlobalTable` columns use).
 */
export interface GlobalDetailField<TRow extends object> {
  readonly key: keyof TRow & string;
  readonly kind: GlobalTableColumnKind;
  readonly label: string;
}

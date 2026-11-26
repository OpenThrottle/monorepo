import type {
  CellContext,
  CellData,
  ColumnDef,
  HeaderContext,
  Row,
  RowData,
  TableFeatures,
} from '@tanstack/react-table';
import {
  createExpandedRowModel,
  rowExpandingFeature,
  tableFeatures,
} from '@tanstack/react-table';

/**
 * @description The TanStack Table v9 features every `DataTable` registers.
 * v9 only exposes the APIs of registered features, so this is the single place
 * the shared table decides what rows and columns can do. Rows without
 * `getSubRows` never expand, so registering expansion leaves a flat table flat.
 * @public
 */
export const dataTableFeatures = tableFeatures({
  expandedRowModel: createExpandedRowModel(),
  rowExpandingFeature,
});

/** @public */
export type DataTableFeatures = typeof dataTableFeatures;

/**
 * @description A column definition for `DataTable`. Consumers use this rather
 * than TanStack's `ColumnDef`, which in v9 also takes the features type.
 * @public
 */
export type DataTableColumnDef<
  TData extends RowData,
  TValue extends CellData = CellData,
> = ColumnDef<DataTableFeatures, TData, TValue>;

/** @public */
export type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>;

/** @public */
export type DataTableCellContext<
  TData extends RowData,
  TValue extends CellData = CellData,
> = CellContext<DataTableFeatures, TData, TValue>;

/** @public */
export type DataTableHeaderContext<
  TData extends RowData,
  TValue extends CellData = CellData,
> = HeaderContext<DataTableFeatures, TData, TValue>;

declare module '@tanstack/react-table' {
  /* eslint-disable @typescript-eslint/no-unused-vars -- merging needs TanStack's exact type parameters, unused here */
  /**
   * @description Per-column options `DataTable` reads from `columnDef.meta`. `cellClassName`
   * lands on every body cell of the column and `headerClassName` on its header cell, so a
   * column can size itself (e.g. `w-full max-w-0` to take the remaining width and truncate)
   * without the table targeting it by position.
   */
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    readonly cellClassName?: string;
    readonly headerClassName?: string;
  }
}

export type { ExpandedState } from '@tanstack/react-table';

import type {
  CellContext,
  CellData,
  ColumnDef,
  HeaderContext,
  Row,
  RowData,
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

export type { ExpandedState } from '@tanstack/react-table';

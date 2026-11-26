'use client';

import type { ExpandedState, OnChangeFn, RowData } from '@tanstack/react-table';
import {
  createColumnHelper,
  flexRender,
  useTable,
} from '@tanstack/react-table';
import clsx from 'clsx';
import * as React from 'react';

import type {
  DataTableColumnDef,
  DataTableFeatures,
  DataTableRow,
} from '../utils/dataTableFeatures';
import { dataTableFeatures } from '../utils/dataTableFeatures';
import { getExpansionOptions } from '../utils/getExpansionOptions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './Table';

export interface DataTableProps<TData extends RowData, TValue> {
  readonly className?: string;
  readonly columns: DataTableColumnDef<TData, TValue>[];
  readonly data: TData[];
  readonly emptyState?: string | React.ReactElement;
  /**
   * Optional: controlled expansion state. Only meaningful alongside `getSubRows`.
   * Supply it together with `onExpandedChange` to own expansion in the consumer;
   * omit both to let the table manage expansion internally (seeded by `initialExpanded`).
   */
  readonly expanded?: ExpandedState;
  /** Optional: custom row id for React keys and row props (e.g. for in-page anchors). */
  readonly getRowId?: (original: TData, index: number) => string;
  /** Optional: props to spread onto each body TableRow (e.g. id for hash links). */
  readonly getRowProps?: (
    row: DataTableRow<TData>,
  ) => React.HTMLAttributes<HTMLTableRowElement>;
  /**
   * Optional: derive nested child rows from a row's original data. Supplying this
   * opts the table into the expanded row model; omitting it leaves the table options
   * identical to the flat table. Cells can read `row.depth`, `row.getCanExpand()`, and
   * `row.getToggleExpandedHandler()` to render their own indent and toggle affordance.
   */
  readonly getSubRows?: (original: TData, index: number) => TData[] | undefined;
  /** Optional: initial (uncontrolled) expansion state. Ignored when `expanded` is supplied. */
  readonly initialExpanded?: ExpandedState;
  /** Optional: notified whenever expansion changes, in both controlled and uncontrolled modes. */
  readonly onExpandedChange?: (expanded: ExpandedState) => void;
}

/**
 * @description Generic data table built with TanStack Table and the Table primitive. Renders columns and data with a core row model; supports extension via table options. Passing `getSubRows` additionally enables nested, expandable rows.
 */
export function DataTable<TData extends RowData, TValue>(
  props: DataTableProps<TData, TValue>,
): React.ReactElement {
  const {
    className,
    columns,
    data,
    emptyState = 'No results.',
    expanded,
    getRowId,
    getRowProps,
    getSubRows,
    initialExpanded,
    onExpandedChange,
  } = props;

  // Hooks
  const [internalExpanded, setInternalExpanded] = React.useState<ExpandedState>(
    initialExpanded ?? {},
  );

  const isExpansionControlled = expanded !== undefined;
  const expandedState = isExpansionControlled ? expanded : internalExpanded;

  const handleExpandedChange: OnChangeFn<ExpandedState> = (updater) => {
    const next =
      typeof updater === 'function' ? updater(expandedState) : updater;

    if (!isExpansionControlled) {
      setInternalExpanded(next);
    }

    onExpandedChange?.(next);
  };

  // v9 makes a column's value type invariant; its column helper is the
  // sanctioned way to hand typed columns to `useTable`.
  const tableColumns = React.useMemo(() => {
    return createColumnHelper<DataTableFeatures, TData>().columns([...columns]);
  }, [columns]);

  const table = useTable({
    columns: tableColumns,
    data,
    features: dataTableFeatures,
    getRowId: getRowId ?? undefined,
    ...getExpansionOptions({
      expandedState,
      getSubRows,
      onExpandedChange: handleExpandedChange,
    }),
  });

  // Setup
  const rows = table.getRowModel().rows ?? [];

  // Handlers

  // Markup
  const hasRows = rows.length > 0;
  const bodyRows = rows.map((row) => (
    <TableRow key={row.id} {...getRowProps?.(row)}>
      {row.getAllCells().map((cell) => (
        <TableCell
          className={cell.column.columnDef.meta?.cellClassName}
          key={cell.id}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  ));
  const emptyRow = (
    <TableRow>
      <TableCell className="h-24 text-center" colSpan={columns.length}>
        {emptyState}
      </TableCell>
    </TableRow>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Table className={clsx('overflow-hidden rounded-md border', className)}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                className={header.column.columnDef.meta?.headerClassName}
                key={header.id}
              >
                {!header.isPlaceholder &&
                  flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>{hasRows ? bodyRows : emptyRow}</TableBody>
    </Table>
  );
}

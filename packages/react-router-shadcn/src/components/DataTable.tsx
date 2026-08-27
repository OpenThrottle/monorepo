'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type ExpandedState,
  type OnChangeFn,
  type Row,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './Table';
import clsx from 'clsx';

export interface DataTableProps<TData, TValue> {
  readonly className?: string;
  readonly columns: ColumnDef<TData, TValue>[];
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
    row: Row<TData>,
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
export function DataTable<TData, TValue>(
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

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ?? undefined,
    ...(getSubRows
      ? {
          getExpandedRowModel: getExpandedRowModel(),
          getSubRows,
          onExpandedChange: handleExpandedChange,
          state: { expanded: expandedState },
        }
      : {}),
  });

  // Setup
  const rows = table.getRowModel().rows ?? [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Table className={clsx('overflow-hidden rounded-md border', className)}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows?.length ? (
          rows.map((row) => (
            <TableRow
              data-state={row.getIsSelected() ? 'selected' : undefined}
              key={row.id}
              {...getRowProps?.(row)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="h-24 text-center" colSpan={columns.length}>
              {emptyState}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type Row,
  flexRender,
  getCoreRowModel,
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

export interface DataTableProps<TData, TValue> {
  readonly columns: ColumnDef<TData, TValue>[];
  readonly data: TData[];
  readonly emptyState?: string | React.ReactElement;
  /** Optional: custom row id for React keys and row props (e.g. for in-page anchors). */
  readonly getRowId?: (original: TData, index: number) => string;
  /** Optional: props to spread onto each body TableRow (e.g. id for hash links). */
  readonly getRowProps?: (
    row: Row<TData>,
  ) => React.HTMLAttributes<HTMLTableRowElement>;
}

/**
 * @description Generic data table built with TanStack Table and the Table primitive. Renders columns and data with a core row model; supports extension via table options.
 */
export function DataTable<TData, TValue>(
  props: DataTableProps<TData, TValue>,
): React.ReactElement {
  const {
    columns,
    data,
    emptyState = 'No results.',
    getRowId,
    getRowProps,
  } = props;

  // Hooks
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ?? undefined,
  });

  // Setup
  const rows = table.getRowModel().rows ?? [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Table className="overflow-hidden rounded-md border">
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

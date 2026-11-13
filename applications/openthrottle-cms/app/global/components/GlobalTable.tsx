import { cn, DataTable } from '@openthrottle/react-router-shadcn';
import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';
import { Link } from 'react-router';

import { GlobalTableCell } from '~/global/components/GlobalTableCell';
import { GLOBAL_TABLE_COPY } from '~/global/data/data.global-table';
import type { GlobalTableColumn } from '~/global/types/global-table';

export interface GlobalTableProps<TRow extends object> {
  readonly className: string | undefined;
  readonly columns: readonly GlobalTableColumn<TRow>[];
  /** Shown in place of the body when `rows` is empty; defaults to the shared copy. */
  readonly emptyState: string | React.ReactElement | undefined;
  /** Returns the detail href for a row; the first column links there when it does. */
  readonly getRowHref: ((row: TRow) => string | undefined) | undefined;
  readonly getRowId: (row: TRow) => string;
  readonly rows: readonly TRow[];
}

/**
 * @description A list table driven by declarative column config: each column names a row field
 * and a {@link GlobalTableColumn} kind, and {@link GlobalTableCell} renders it. Built on
 * `DataTable`, for index screens that list records without bespoke cell markup.
 */
export const GlobalTable = <TRow extends object>(
  props: GlobalTableProps<TRow>,
): React.ReactElement => {
  const { className, columns, emptyState, getRowHref, getRowId, rows } = props;

  // Hooks
  const columnDefs = React.useMemo<ColumnDef<TRow, unknown>[]>(() => {
    return columns.map((column, index) => ({
      accessorFn: (row) => row[column.key],
      cell: (context) => {
        const cell = (
          <GlobalTableCell
            className={undefined}
            kind={column.kind}
            value={context.getValue()}
          />
        );
        const href =
          index === 0 ? getRowHref?.(context.row.original) : undefined;
        if (href === undefined) {
          return cell;
        }
        return (
          <Link
            className={cn('font-medium underline-offset-4 hover:underline')}
            to={href}
          >
            {cell}
          </Link>
        );
      },
      header: column.header,
      id: column.key,
    }));
  }, [columns, getRowHref]);

  // Setup
  const data = React.useMemo(() => [...rows], [rows]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)} data-testid="GlobalTable">
      <DataTable
        columns={columnDefs}
        data={data}
        emptyState={emptyState ?? GLOBAL_TABLE_COPY.empty}
        getRowId={getRowId}
      />
    </div>
  );
};

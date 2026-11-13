import { cn, DataTable } from '@openthrottle/react-router-shadcn';
import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';

import { GlobalTableCell } from '~/global/components/GlobalTableCell';
import { GLOBAL_TABLE_COPY } from '~/global/data/data.global-table';
import type { GlobalTableColumn } from '~/global/types/global-table';

export interface GlobalTableProps<TRow extends object> {
  readonly className: string | undefined;
  readonly columns: readonly GlobalTableColumn<TRow>[];
  /** Shown in place of the body when `rows` is empty; defaults to the shared copy. */
  readonly emptyState: string | React.ReactElement | undefined;
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
  const { className, columns, emptyState, getRowId, rows } = props;

  // Hooks
  const columnDefs = React.useMemo<ColumnDef<TRow, unknown>[]>(() => {
    return columns.map((column) => ({
      accessorFn: (row) => row[column.key],
      cell: (context) => (
        <GlobalTableCell
          className={undefined}
          kind={column.kind}
          value={context.getValue()}
        />
      ),
      header: column.header,
      id: column.key,
    }));
  }, [columns]);

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

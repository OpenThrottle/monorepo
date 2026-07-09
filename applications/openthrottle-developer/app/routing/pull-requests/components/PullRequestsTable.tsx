import * as React from 'react';
import clsx from 'clsx';
import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { DataTable } from '@openthrottle/react-router-shadcn';
import {
  createPullRequestsTableColumns,
  getPullRequestsTableRowId,
} from '~/routing/pull-requests/config/pull-requests-table-columns';
import type { PullRequestsTableColumnValue } from '~/routing/pull-requests/config/pull-requests-table-columns';
import type { PullRequestsListFilters } from '~/routing/pull-requests/types/pull-requests-list-filters';

export interface PullRequestsTableProps {
  className?: string;
  filters: PullRequestsListFilters;
  listQuery: string;
  pulls: PullRequestCardFragment[];
}

export const PullRequestsTable = (
  props: PullRequestsTableProps,
): React.ReactElement => {
  const { className, filters, listQuery, pulls } = props;

  // Hooks

  // Setup
  const columnsContext = React.useMemo(
    () => ({ filters, listQuery }),
    [filters, listQuery],
  );

  const columns = React.useMemo(
    () => createPullRequestsTableColumns(columnsContext),
    [columnsContext],
  );

  const data = React.useMemo(() => [...pulls], [pulls]);

  const getRowId = React.useCallback(getPullRequestsTableRowId, []);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      data-testid="PullRequestsTable"
    >
      <DataTable<PullRequestCardFragment, PullRequestsTableColumnValue>
        columns={columns}
        data={data}
        getRowId={getRowId}
      />
    </div>
  );
};

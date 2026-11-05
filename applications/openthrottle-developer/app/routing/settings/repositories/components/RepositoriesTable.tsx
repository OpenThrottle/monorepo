import { cn, DataTable } from '@openthrottle/react-router-shadcn';
import {
  GlobalFeatureOnboarding,
  GlobalPopoverActionsHeader,
} from '@openthrottle/react-router-ui-global';
import type { ColumnDef, ExpandedState } from '@tanstack/react-table';
import * as React from 'react';

import { formatUpdatedAt } from '~/routing/plans/utils/formatters';
import { RepositoriesTableEmpty } from '~/routing/settings/repositories/components/RepositoriesTableEmpty';
import { RepositoryBranchCell } from '~/routing/settings/repositories/components/RepositoryBranchCell';
import { RepositoryHookTelemetryCell } from '~/routing/settings/repositories/components/RepositoryHookTelemetryCell';
import { RepositoryInjectionCell } from '~/routing/settings/repositories/components/RepositoryInjectionCell';
import { RepositoryNameCell } from '~/routing/settings/repositories/components/RepositoryNameCell';
import { RepositoryRowActions } from '~/routing/settings/repositories/components/RepositoryRowActions';
import { RepositoryWarningsCell } from '~/routing/settings/repositories/components/RepositoryWarningsCell';
import {
  REPOSITORIES_ONBOARDING,
  REPOSITORIES_TABLE_COPY,
  REPOSITORY_HOOK_TELEMETRY_COPY,
} from '~/routing/settings/repositories/data/data.copy';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/types';
import { toExpandedState } from '~/routing/settings/repositories/utils/expansion';
import type { CheckoutDrift } from '~/routing/settings/utils/drift-labels';

export interface RepositoriesTableProps {
  /** Parent row ids to open on mount, e.g. groups whose worktree matched the search. */
  autoExpandedIds: string[];
  className?: string;
  driftByCheckoutId?: Record<string, CheckoutDrift>;
  /** True when the workspace has no repositories at all, as opposed to none matching a search. */
  isUnpopulated: boolean;
  rows: RepositoryCheckoutRow[];
}

export const RepositoriesTable = (
  props: RepositoriesTableProps,
): React.ReactElement => {
  const { autoExpandedIds, className, driftByCheckoutId, isUnpopulated, rows } =
    props;

  // Hooks
  const [expanded, setExpanded] = React.useState<ExpandedState>(() =>
    toExpandedState(autoExpandedIds),
  );

  const columns = React.useMemo(
    () => RepositoriesTable.buildTable(driftByCheckoutId),
    [driftByCheckoutId],
  );
  const data = React.useMemo(() => [...rows], [rows]);

  // Setup

  // Handlers

  // Markup
  const onboarding = (
    <GlobalFeatureOnboarding content={REPOSITORIES_ONBOARDING} />
  );
  const emptyTable = <RepositoriesTableEmpty />;

  // Life Cycle
  React.useEffect(() => {
    setExpanded(toExpandedState(autoExpandedIds));
  }, [autoExpandedIds]);

  // 🔌 Short Circuit

  return (
    <div
      className={cn('ui-border rounded-lg border', className)}
      data-testid="RepositoriesTable"
    >
      <DataTable<RepositoryCheckoutRow, string | null | undefined>
        columns={columns}
        data={data}
        emptyState={isUnpopulated ? onboarding : emptyTable}
        expanded={expanded}
        getRowId={(original) => original.id}
        getSubRows={(original) => original.children}
        onExpandedChange={setExpanded}
      />
    </div>
  );
};

RepositoriesTable.buildTable = (
  driftByCheckoutId?: Record<string, CheckoutDrift>,
): ColumnDef<RepositoryCheckoutRow, string | null | undefined>[] => {
  return [
    {
      cell: ({ row }) => (
        <RepositoryNameCell
          canExpand={row.getCanExpand()}
          depth={row.depth}
          isExpanded={row.getIsExpanded()}
          onToggleExpanded={row.getToggleExpandedHandler()}
          row={row.original}
        />
      ),
      header: () => REPOSITORIES_TABLE_COPY.repositoryColumn,
      id: 'repository',
    },
    {
      cell: ({ row }) => <RepositoryBranchCell row={row.original} />,
      header: () => REPOSITORIES_TABLE_COPY.branchColumn,
      id: 'branch',
    },
    {
      cell: ({ row }) => (
        <RepositoryInjectionCell depth={row.depth} row={row.original} />
      ),
      header: () => REPOSITORIES_TABLE_COPY.injectionColumn,
      id: 'injection',
    },
    {
      cell: ({ row }) => <RepositoryHookTelemetryCell row={row.original} />,
      header: () => REPOSITORY_HOOK_TELEMETRY_COPY.columnLabel,
      id: 'hookTelemetry',
    },
    {
      cell: ({ row }) => (
        <RepositoryWarningsCell
          driftByCheckoutId={driftByCheckoutId}
          row={row.original}
        />
      ),
      header: () => REPOSITORIES_TABLE_COPY.warningsColumn,
      id: 'warnings',
    },
    {
      cell: ({ row }) => (
        <span
          className="text-muted-foreground text-xs"
          title={String(row.original.updatedAt ?? '')}
        >
          {formatUpdatedAt(row.original.updatedAt)}
        </span>
      ),
      header: () => REPOSITORIES_TABLE_COPY.updatedColumn,
      id: 'updatedAt',
    },
    {
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <RepositoryRowActions row={row.original} />
        </div>
      ),
      header: () => <GlobalPopoverActionsHeader />,
      id: 'actions',
    },
  ];
};

import * as React from 'react';
import clsx from 'clsx';
import { Badge, DataTable } from '@openthrottle/react-router-shadcn';
import {
  GlobalFeatureOnboarding,
  GlobalPopoverActionsHeader,
} from '@openthrottle/react-router-ui-global';
import { Link } from 'react-router';
import type { ColumnDef, ExpandedState } from '@tanstack/react-table';
import { formatUpdatedAt } from '~/routing/plans/utils/formatters';
import {
  REPOSITORIES_ONBOARDING,
  REPOSITORIES_TABLE_COPY,
} from '~/routing/settings/repositories/data/data.copy';
import { driftLabels } from '~/routing/settings/utils/drift-labels';
import { RepositoriesTableEmpty } from '~/routing/settings/repositories/components/RepositoriesTableEmpty';
import { RepositoryInjectionCell } from '~/routing/settings/repositories/components/RepositoryInjectionCell';
import { RepositoryNameCell } from '~/routing/settings/repositories/components/RepositoryNameCell';
import { RepositoryRowActions } from '~/routing/settings/repositories/components/RepositoryRowActions';
import { deriveWorktreeBadges } from '~/routing/settings/repositories/utils/worktree-badges';
import { toExpandedState } from '~/routing/settings/repositories/utils/expansion';
import { planDetailPath } from '~/routing/settings/repositories/utils/paths';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import type { CheckoutDrift } from '~/routing/settings/utils/drift-labels';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';

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

  // Life Cycle
  React.useEffect(() => {
    setExpanded(toExpandedState(autoExpandedIds));
  }, [autoExpandedIds]);

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('bg-card ui-border rounded-lg border', className)}
      data-testid="RepositoriesTable"
    >
      <DataTable<RepositoryCheckoutRow, string | null | undefined>
        columns={columns}
        data={data}
        emptyState={
          isUnpopulated ? (
            <GlobalFeatureOnboarding content={REPOSITORIES_ONBOARDING} />
          ) : (
            <RepositoriesTableEmpty />
          )
        }
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
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          {row.original.branch ? (
            <Badge variant="outline">{row.original.branch}</Badge>
          ) : null}
          {row.original.checkout?.managed ? (
            <Badge variant="secondary">
              {WORKSPACE_FOLDERS_COPY.managedBadge}
            </Badge>
          ) : null}
          {deriveWorktreeBadges(row.original).map((badge) => (
            <Badge
              color={badge.tone === 'activity' ? 'green' : 'orange'}
              key={badge.id}
              size="xs"
              title={badge.title}
              variant="secondary"
            >
              {badge.label}
            </Badge>
          ))}
          {row.original.planId ? (
            <Link
              className="hover:text-primary text-xs underline underline-offset-2"
              to={planDetailPath(row.original.planId)}
            >
              {REPOSITORIES_TABLE_COPY.worktreeRunLinkLabel}
            </Link>
          ) : null}
        </div>
      ),
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
      cell: ({ row }) => {
        const checkoutId = row.original.checkout?.id;
        const drift =
          checkoutId === undefined
            ? undefined
            : driftByCheckoutId?.[checkoutId];
        const warnings = drift ? driftLabels(drift) : [];

        return warnings.length === 0 ? null : (
          <ul className="space-y-1" role="alert">
            {warnings.map((warning) => (
              <li className="text-destructive text-xs" key={warning}>
                {warning}
              </li>
            ))}
          </ul>
        );
      },
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
      cell: ({ row }) => <RepositoryRowActions row={row.original} />,
      header: () => <GlobalPopoverActionsHeader />,
      id: 'actions',
    },
  ];
};

import * as React from 'react';
import clsx from 'clsx';
import { DataTable } from '@openthrottle/react-router-shadcn';
import { readSearchParam } from '@openthrottle/react-router-ui-global';
import { useSearchParams } from 'react-router';
import { PlanTasksEmpty } from '~/routing/plans/components/PlanTasksEmpty';
import { buildPlansTableColumns } from '~/routing/plans/utils/plans-table-columns';
import type { PlanCardFragment } from '~/__generated__/graphql';

export interface PlansTableProps {
  className?: string;
  plans: PlanCardFragment[];
  /** When set, status pills link to filter by that status (e.g. ?status=PENDING). Key = status value. */
  statusFilterUrls?: Record<string, string>;
}

export const PlansTable = (props: PlansTableProps): React.ReactElement => {
  const { className, plans, statusFilterUrls } = props;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  // A zero-row result is "filtered" when any of the URL-driven filters is
  // active (search text, status, or assignee) — not just the `q` param — so the
  // empty state points at clearing filters rather than onboarding.
  const hasActiveFilters =
    readSearchParam(searchParams) !== '' ||
    searchParams.getAll('status').length > 0 ||
    searchParams.getAll('assignee').length > 0;

  const columns = React.useMemo(
    () => buildPlansTableColumns(statusFilterUrls),
    [plans, statusFilterUrls],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      data-testid="PlansTable"
    >
      <DataTable<PlanCardFragment, string | number | null | undefined>
        columns={columns}
        data={plans}
        emptyState={<PlanTasksEmpty filtered={hasActiveFilters} />}
      />
    </div>
  );
};

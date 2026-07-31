import * as React from 'react';
import clsx from 'clsx';
import { action as planDetailAction } from '~/routes/plans.$planId._index';
import { DataTable } from '@openthrottle/react-router-shadcn';
import { useFetcher, useSearchParams } from 'react-router';
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
  const runPlanFetcher = useFetcher<typeof planDetailAction>();
  const [searchParams] = useSearchParams();

  // Setup
  const search = searchParams.get('q') ?? '';
  const columns = React.useMemo(
    () => buildPlansTableColumns(statusFilterUrls, runPlanFetcher),
    [plans, runPlanFetcher, statusFilterUrls],
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
        emptyState={<PlanTasksEmpty search={search} />}
      />
    </div>
  );
};

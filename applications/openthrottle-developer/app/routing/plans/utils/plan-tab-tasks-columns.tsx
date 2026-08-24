/**
 * @description Column definitions for the {@link PlanTabTasks} table view.
 * Hoisted from the component file per component-primitive-shape R4
 * (module-scope helpers live in the sibling utils/ folder) so the tab
 * component stays UI-focused.
 */
import * as React from 'react';
import { GlobalPopoverActionsHeader } from '@openthrottle/react-router-ui-global';
import {
  isPlanStatusKey,
  PlanStatusBadge,
} from '~/routing/plans/components/PlanStatusBadge';
import { PlanTasksTableCellActions } from '~/routing/plans/components/PlanTasksTableCellActions';
import { PlanTasksTableCellTitle } from '~/routing/plans/components/PlanTasksTableCellTitle';
import { getPlanTaskStepIndex } from '~/routing/plans/utils/sort-plan-tasks-by-list-order';
import type { ColumnDef } from '@tanstack/react-table';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';

export const buildPlanTabTasksColumns = (
  managedTaskIds: ReadonlySet<string>,
): ColumnDef<PlanTaskRowFragment, string | null | undefined>[] => {
  return [
    {
      cell: ({ row }) => (
        <span
          aria-label={`Step ${getPlanTaskStepIndex(row.index)}`}
          className="text-muted-foreground tabular-nums"
        >
          #{getPlanTaskStepIndex(row.index)}
        </span>
      ),
      header: () => <span className="inline-block w-full text-center">#</span>,
      id: 'step',
    },
    {
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className="p-2">
            {isPlanStatusKey(status) ? (
              <PlanStatusBadge status={status} />
            ) : (
              status
            )}
          </div>
        );
      },
      header: () => <span className="p-2 text-center">Status</span>,
    },
    {
      accessorKey: 'title',
      cell: ({ row }) => (
        <PlanTasksTableCellTitle
          isManaged={managedTaskIds.has(row.original.id)}
          row={row}
        />
      ),
      // Category and requirements now live inline in the title cell (matching
      // the plans index list language), so they are no longer standalone
      // columns here.
      header: () => 'Title / Context',
    },
    {
      cell: ({ row }) => <PlanTasksTableCellActions row={row} />,
      header: () => <GlobalPopoverActionsHeader />,
      id: 'actions',
    },
  ];
};

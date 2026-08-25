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
import type { ColumnDef } from '@tanstack/react-table';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';

export const buildPlanTabTasksColumns = (
  managedTaskIds: ReadonlySet<string>,
): ColumnDef<PlanTaskRowFragment, string | null | undefined>[] => {
  return [
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
      header: () => <div className="p-2">Status</div>,
    },
    {
      accessorKey: 'details',
      cell: ({ row }) => (
        <div className="p-2">
          <PlanTasksTableCellTitle
            isManaged={managedTaskIds.has(row.original.id)}
            row={row}
          />
        </div>
      ),
      // Category and requirements now live inline in the title cell (matching
      // the plans index list language), so they are no longer standalone
      // columns here.
      header: () => <div className="p-2">Task Details</div>,
    },
    {
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <PlanTasksTableCellActions row={row} />
        </div>
      ),
      header: () => <GlobalPopoverActionsHeader />,
      id: 'actions',
    },
  ];
};

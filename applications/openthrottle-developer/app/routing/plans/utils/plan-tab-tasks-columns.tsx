/**
 * @description Column definitions for the {@link PlanTabTasks} table view.
 * Hoisted from the component file per component-primitive-shape R4
 * (module-scope helpers live in the sibling utils/ folder) so the tab
 * component stays UI-focused.
 */
import * as React from 'react';
import {
  isPlanStatusKey,
  PlanStatusBadge,
} from '~/routing/plans/components/PlanStatusBadge';
import { PlanTasksTableCellActions } from '~/routing/plans/components/PlanTasksTableCellActions';
import { PlanTasksTableCellTitle } from '~/routing/plans/components/PlanTasksTableCellTitle';
import { getRequirementsCount } from '~/routing/plans/utils/formatters';
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
      header: () => 'Title / Context',
    },
    {
      accessorKey: 'category',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.category ?? '—'}
        </span>
      ),
      header: () => 'Category',
    },
    // {
    //   accessorKey: 'projectRelation',
    //   cell: ({ row }) => {
    //     const project = row.original.projectRelation;
    //     if (project == null) {
    //       return <span className="text-muted-foreground">—</span>;
    //     }
    //     return (
    //       <Link
    //         className="text-xs underline underline-offset-2 hover:text-primary"
    //         to={`/projects/${project.id}`}
    //         viewTransition={true}
    //       >
    //         {project.name}
    //       </Link>
    //     );
    //   },
    //   header: () => 'Project',
    // },
    {
      accessorKey: 'requirementsJson',
      cell: ({ row }) => {
        const count = getRequirementsCount(row.original.requirementsJson);
        return (
          <span className="text-muted-foreground tabular-nums">
            {count === 0 ? '—' : count}
          </span>
        );
      },
      header: () => (
        <span className="inline-block w-full text-center">Requirements</span>
      ),
    },
    // {
    //   accessorKey: 'updatedAt',
    //   cell: ({ row }) => {
    //     const task = row.original;
    //     const relative = formatUpdatedAt(task.updatedAt);
    //     const exact = formatDateShort(task.updatedAt);

    //     if (relative == null) {
    //       return <span className="text-muted-foreground text-xs">—</span>;
    //     }

    //     const content = (
    //       <span className="text-muted-foreground text-xs whitespace-nowrap">
    //         {relative}
    //       </span>
    //     );

    //     if (exact != null) {
    //       return (
    //         <Tooltip>
    //           <TooltipTrigger asChild={true}>
    //             <span className="cursor-default">{content}</span>
    //           </TooltipTrigger>
    //           <TooltipContent>
    //             Updated {exact}
    //             {formatDateShort(task.createdAt) != null
    //               ? ` · Created ${formatDateShort(task.createdAt)}`
    //               : ''}
    //           </TooltipContent>
    //         </Tooltip>
    //       );
    //     }
    //     return content;
    //   },
    //   header: () => (
    //     <span className="inline-block w-full text-right">Updated</span>
    //   ),
    // },
    {
      cell: ({ row }) => <PlanTasksTableCellActions row={row} />,
      header: () => 'Actions',
      id: 'actions',
    },
  ];
};

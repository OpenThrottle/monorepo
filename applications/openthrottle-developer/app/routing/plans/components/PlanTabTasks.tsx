import * as React from 'react';
import {
  DataTable,
  TabsContent,
  // ToggleGroup,
  // ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
// import { List, Table2 } from 'lucide-react';
import { getRequirementsCount } from '~/routing/plans/utils/formatters';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { PlanTaskItems } from '~/routing/plans/components/PlanTaskItems';
import { PlanTaskRowFragment } from '~/__generated__/graphql';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { PlanTasksEmpty } from '~/routing/plans/components/PlanTasksEmpty';
import { PlanTasksTableCellActions } from '~/routing/plans/components/PlanTasksTableCellActions';
import { PlanTasksTableCellTitle } from '~/routing/plans/components/PlanTasksTableCellTitle';
import {
  getPlanTaskStepIndex,
  sortPlanTasksByListOrder,
} from '~/routing/plans/utils/sort-plan-tasks-by-list-order';
import type { ColumnDef } from '@tanstack/react-table';

const PLAN_TASKS_VIEW = {
  list: 'list',
  table: 'table',
} as const;

type PlanTasksView = (typeof PLAN_TASKS_VIEW)[keyof typeof PLAN_TASKS_VIEW];

export interface PlanTabTasksProps {
  tasks: PlanTaskRowFragment[];
}

export const PlanTabTasks = (): React.ReactElement => {
  // Hooks
  const [view /*, setView */] = React.useState<PlanTasksView>(
    PLAN_TASKS_VIEW.list,
  );
  const { tasks } = usePlanDetailRouteData();
  const sortedTasks = React.useMemo(
    () => sortPlanTasksByListOrder(tasks),
    [tasks],
  );
  const columns = React.useMemo(() => PlanTabTasks.buildTable(), []);

  // Setup
  const getRowId = React.useCallback(
    (task: PlanTaskRowFragment) => task.id,
    [],
  );

  const getRowProps = React.useCallback(
    (row: { original: PlanTaskRowFragment }) => ({
      id: `task-${row.original.id}`,
    }),
    [],
  );

  // Handlers
  // const handleViewChange = React.useCallback((value: string) => {
  //   // Radix emits '' when the active item is re-clicked; keep one view selected.
  //   if (value === PLAN_TASKS_VIEW.list || value === PLAN_TASKS_VIEW.table) {
  //     setView(value);
  //   }
  // }, []);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent value="tasks">
      {/* <div className="flex justify-end pb-2">
        <ToggleGroup
          aria-label="Task view"
          data-testid="PlanTabTasks-view-toggle"
          onValueChange={handleViewChange}
          size="xs"
          type="single"
          value={view}
          variant="outline"
        >
          <ToggleGroupItem aria-label="List view" value={PLAN_TASKS_VIEW.list}>
            <List className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Table view"
            value={PLAN_TASKS_VIEW.table}
          >
            <Table2 className="size-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div> */}

      {view === PLAN_TASKS_VIEW.list ? (
        <PlanTaskItems tasks={sortedTasks} />
      ) : (
        <div className="bg-card border-card-border rounded-lg border">
          <DataTable<PlanTaskRowFragment, string | null | undefined>
            columns={columns}
            data={sortedTasks}
            emptyState={<PlanTasksEmpty />}
            getRowId={getRowId}
            getRowProps={getRowProps}
          />
        </div>
      )}
    </TabsContent>
  );
};

PlanTabTasks.buildTable = (): ColumnDef<
  PlanTaskRowFragment,
  string | null | undefined
>[] => {
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
            <PlanStatusBadge
              status={status as Parameters<typeof PlanStatusBadge>[0]['status']}
            />
          </div>
        );
      },
      header: () => <span className="p-2 text-center">Status</span>,
    },
    {
      accessorKey: 'title',
      cell: ({ row }) => <PlanTasksTableCellTitle row={row} />,
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

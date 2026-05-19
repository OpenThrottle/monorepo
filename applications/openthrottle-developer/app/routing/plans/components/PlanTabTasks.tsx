import * as React from 'react';
import {
  DataTable,
  TabsContent,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import {
  formatDateShort,
  formatUpdatedAt,
  getRequirementsCount,
} from '~/routing/plans/utils/formatters';
import { PlanTasksTableCellActions } from '~/routing/plans/components/PlanTasksTableCellActions';
import { PlanTasksTableCellTitle } from '~/routing/plans/components/PlanTasksTableCellTitle';
import { PlanTasksEmpty } from '~/routing/plans/components/PlanTasksEmpty';

export interface PlanTabTasksProp {
  readonly tasks: PlanTaskRowFragment[];
}

export const PlanTabTasks = (props: PlanTabTasksProp): React.ReactElement => {
  const { tasks } = props;

  // Hooks
  const columns = React.useMemo(() => PlanTabTasks.buildTable(), []);
  const [data, _setData] = React.useState(tasks);

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

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (tasks.length === 0) {
    return (
      <TabsContent value="tasks">
        <PlanTasksEmpty />
      </TabsContent>
    );
  }

  return (
    <TabsContent value="tasks">
      <div
        // className="flex flex-col gap-4 md:gap-8"
        className="bg-card rounded-lg border border-card-border"
      >
        <DataTable<PlanTaskRowFragment, string | null | undefined>
          columns={columns}
          data={data}
          getRowId={getRowId}
          getRowProps={getRowProps}
        />
      </div>
    </TabsContent>
  );
};

PlanTabTasks.buildTable = (): ColumnDef<
  PlanTaskRowFragment,
  string | null | undefined
>[] => {
  return [
    {
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className="px-4 py-2">
            <PlanStatusBadge
              status={status as Parameters<typeof PlanStatusBadge>[0]['status']}
            />
          </div>
        );
      },
      header: () => (
        <span className="px-4 py-2 inline-block w-full text-center">
          Status
        </span>
      ),
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
    {
      accessorKey: 'projectRelation',
      cell: ({ row }) => {
        const project = row.original.projectRelation;
        if (project == null) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <Link
            className="text-xs underline underline-offset-2 hover:text-primary"
            to={`/projects/${project.id}`}
            viewTransition={true}
          >
            {project.name}
          </Link>
        );
      },
      header: () => 'Project',
    },
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
    {
      accessorKey: 'updatedAt',
      cell: ({ row }) => {
        const task = row.original;
        const relative = formatUpdatedAt(task.updatedAt);
        const exact = formatDateShort(task.updatedAt);

        if (relative == null) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }

        const content = (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {relative}
          </span>
        );

        if (exact != null) {
          return (
            <Tooltip>
              <TooltipTrigger asChild={true}>
                <span className="cursor-default">{content}</span>
              </TooltipTrigger>
              <TooltipContent>
                Updated {exact}
                {formatDateShort(task.createdAt) != null
                  ? ` · Created ${formatDateShort(task.createdAt)}`
                  : ''}
              </TooltipContent>
            </Tooltip>
          );
        }
        return content;
      },
      header: () => (
        <span className="inline-block w-full text-right">Updated</span>
      ),
    },
    {
      cell: ({ row }) => <PlanTasksTableCellActions row={row} />,
      header: () => 'Actions',
      id: 'actions',
    },
  ];
};

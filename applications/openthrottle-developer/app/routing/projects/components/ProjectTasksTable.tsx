import * as React from 'react';
import clsx from 'clsx';
import { Badge, DataTable } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import type { GetProjectByIdQuery } from '~/__generated__/graphql';
import { formatProjectDate } from '~/routing/projects/utils/format';

type ProjectTaskRow =
  GetProjectByIdQuery['projectTasksResult']['tasks'][number];

export interface ProjectTasksTableProps {
  className?: string;
  tasks: ProjectTaskRow[];
}

export const ProjectTasksTable = (
  props: ProjectTasksTableProps,
): React.ReactElement => {
  const { className, tasks } = props;

  // Hooks
  const columns = React.useMemo(() => ProjectTasksTable.buildTable(), []);
  const data = React.useMemo(() => [...tasks], [tasks]);
  const getRowId = React.useCallback((task: ProjectTaskRow) => task.id, []);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('bg-card ui-border rounded-lg border', className)}
      data-testid="ProjectTasksTable"
    >
      <DataTable<ProjectTaskRow, string | number | null | undefined>
        columns={columns}
        data={data}
        getRowId={getRowId}
      />
    </div>
  );
};

ProjectTasksTable.buildTable = (): ColumnDef<
  ProjectTaskRow,
  string | number | null | undefined
>[] => {
  return [
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const task = row.original;
        const title = task.title ?? 'Untitled';
        return (
          <div className="overflow-hidden p-4 py-2">
            <span className="text-sm font-medium">{title}</span>
          </div>
        );
      },
      header: () => 'Title',
    },
    {
      accessorKey: 'category',
      cell: ({ row }) => {
        const category = row.original.category;
        return category ? (
          <Badge color="slate" size="xs" variant="secondary">
            {category}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
      header: () => 'Category',
    },
    {
      accessorKey: 'assignee',
      cell: ({ row }) => {
        const assignee = row.original.assignee;
        return (
          <span className="text-muted-foreground text-sm">
            {assignee ?? '—'}
          </span>
        );
      },
      header: () => 'Assignee',
    },
    {
      accessorKey: 'updatedAt',
      cell: ({ row }) => {
        const formatted = formatProjectDate(row.original.updatedAt);
        return (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {formatted}
          </span>
        );
      },
      header: () => (
        <span className="inline-block w-full text-right">Updated</span>
      ),
    },
    {
      accessorKey: 'planId',
      cell: ({ row }) => {
        const task = row.original;
        const planId = task.planId;
        if (!planId) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <Link
            aria-label={`View plan for task: ${task.title ?? 'Untitled'}`}
            className="hover:text-primary text-xs underline underline-offset-2"
            prefetch="intent"
            to={`/plans/${planId}`}
            viewTransition={true}
          >
            View plan
          </Link>
        );
      },
      header: () => 'Plan',
      id: 'plan',
    },
  ];
};

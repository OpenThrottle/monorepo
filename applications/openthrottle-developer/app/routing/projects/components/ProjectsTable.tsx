import * as React from 'react';
import { Button, DataTable } from '@openthrottle/react-router-shadcn';
import { format } from 'date-fns';
import { Link } from 'react-router';
import classnames from 'classnames';
import type { ColumnDef } from '@tanstack/react-table';
import type { ProjectCardFragment } from '~/__generated__/graphql';

function formatUpdatedAt(project: ProjectCardFragment): string {
  const raw = project.updatedAt ?? project.createdAt;
  if (raw == null) return '—';
  try {
    const date = typeof raw === 'string' ? new Date(raw) : raw;
    return format(date, 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

const projectTableColumns: ColumnDef<
  ProjectCardFragment,
  string | null | undefined
>[] = [
  {
    accessorKey: 'name',
    cell: ({ row }) => {
      const project = row.original;
      const projectHref = `/projects/${project.id}`;
      const name = project.name ?? 'Untitled';

      return (
        <div className="p-4 py-2 w-full flex-1 overflow-hidden">
          <h2 className="text-xs line-clamp-1 text-ellipsis font-medium mb-1">
            <Link
              aria-label={`View project: ${name}`}
              className="underline underline-offset-2 hover:text-primary"
              to={projectHref}
              viewTransition={true}
            >
              {name}
            </Link>
          </h2>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {project.description ?? ''}
          </p>
        </div>
      );
    },
    header: () => <div className="p-4 py-2">Context</div>,
  },
  {
    accessorKey: 'plans',
    cell: ({ row }) => row.original.plans?.length ?? 0,
    header: () => 'Plans',
  },
  {
    accessorKey: 'tasks',
    cell: ({ row }) => row.original.tasks?.length ?? 0,
    header: () => 'Tasks',
  },
  {
    accessorKey: 'updatedAt',
    cell: ({ row }) => (
      <span
        className="text-muted-foreground text-xs"
        title={String(row.original.updatedAt ?? row.original.createdAt ?? '')}
      >
        {formatUpdatedAt(row.original)}
      </span>
    ),
    header: () => 'Updated',
  },
  {
    cell: ({ row }) => (
      <Button asChild={true} className="text-xs" size="xs" variant="outline">
        <Link to={`/projects/${row.original.id}`} viewTransition={true}>
          View Project
        </Link>
      </Button>
    ),
    header: () => 'Actions',
    id: 'view',
  },
];

export interface ProjectsTableProps {
  className?: string;
  projects: ProjectCardFragment[];
}

export const ProjectsTable = (props: ProjectsTableProps) => {
  const { className, projects } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('border ui-border rounded-lg', className)}
      data-testid="ProjectsTable"
    >
      <DataTable<ProjectCardFragment, string | null | undefined>
        columns={projectTableColumns}
        data={projects}
      />
    </div>
  );
};

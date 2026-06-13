import * as React from 'react';
import classnames from 'classnames';
import { Button, DataTable } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { ProjectsEmpty } from '~/routing/projects/components/ProjectsEmpty';
import { formatUpdatedAt } from '~/routing/plans/utils/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { ProjectCardFragment } from '~/__generated__/graphql';

export interface ProjectsTableProps {
  className?: string;
  projects: ProjectCardFragment[];
}

export const ProjectsTable = (
  props: ProjectsTableProps,
): React.ReactElement => {
  const { className, projects } = props;

  // Hooks
  const columns = React.useMemo(() => ProjectsTable.buildTable(), []);
  const data = React.useMemo(() => [...projects], [projects]);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('bg-card ui-border rounded-lg border', className)}
      data-testid="ProjectsTable"
    >
      <DataTable<ProjectCardFragment, string | null | undefined>
        columns={columns}
        data={data}
        emptyState={<ProjectsEmpty />}
      />
    </div>
  );
};

ProjectsTable.buildTable = (): ColumnDef<
  ProjectCardFragment,
  string | null | undefined
>[] => {
  return [
    {
      accessorKey: 'name',
      cell: ({ row }) => {
        const project = row.original;
        const projectHref = `/projects/${project.id}`;
        const name = project.name ?? 'Untitled';

        return (
          <div className="w-full flex-1 overflow-hidden p-4 py-2">
            <h2 className="mb-1 line-clamp-1 text-xs font-medium text-ellipsis">
              <Link
                aria-label={`View project: ${name}`}
                className="hover:text-primary underline underline-offset-2"
                to={projectHref}
                viewTransition={true}
              >
                {name}
              </Link>
            </h2>
            <p className="text-muted-foreground line-clamp-2 text-xs">
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
          {formatUpdatedAt(row.original.updatedAt)}
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
};

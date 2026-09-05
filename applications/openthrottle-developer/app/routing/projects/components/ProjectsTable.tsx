import * as React from 'react';
import clsx from 'clsx';
import { DataTable } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { ProjectsEmpty } from '~/routing/projects/components/ProjectsEmpty';
import { PROJECTS_ROW_ACTIONS_COPY } from '~/routing/projects/data/data.copy';
// import { formatUpdatedAt } from '~/routing/plans/utils/formatters';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import {
  GlobalPopover,
  GlobalPopoverActionsHeader,
} from '@openthrottle/react-router-ui-global';
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
      className={clsx('ui-border rounded-lg border', className)}
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
      accessorKey: 'details',
      cell: ({ row }) => {
        const project = row.original;
        const projectHref = `/projects/${project.id}`;
        const name = project.name ?? 'Untitled';

        return (
          <div className="w-full flex-1 overflow-hidden p-4 py-2">
            <Link
              aria-label={`View project: ${name}`}
              className="hover:text-primary underline underline-offset-2"
              to={projectHref}
              viewTransition={true}
            >
              <h2 className="mb-1 line-clamp-1 text-sm font-medium text-ellipsis">
                {name}
              </h2>
            </Link>
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {project.description ?? ''}
            </p>
          </div>
        );
      },
      header: () => <div className="p-4 py-2">Project Details</div>,
    },
    {
      accessorKey: 'actions',
      cell: ({ row }) => {
        const project = row.original;
        const name = project.name ?? 'Untitled project';
        const actions: GlobalPopoverAction[] = [
          {
            id: 'view',
            kind: 'link',
            label: PROJECTS_ROW_ACTIONS_COPY.view,
            to: `/projects/${project.id}`,
          },
        ];

        return (
          <div className="flex items-center justify-center">
            <GlobalPopover
              actions={actions}
              ariaLabel={`${PROJECTS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${name}`}
            />
          </div>
        );
      },
      header: () => <GlobalPopoverActionsHeader />,
    },
    // {
    //   accessorKey: 'plans',
    //   cell: ({ row }) => row.original.plans?.length ?? 0,
    //   header: () => 'Plans',
    // },
    // {
    //   accessorKey: 'tasks',
    //   cell: ({ row }) => row.original.tasks?.length ?? 0,
    //   header: () => 'Tasks',
    // },
    // {
    //   accessorKey: 'updatedAt',
    //   cell: ({ row }) => (
    //     <span
    //       className="text-muted-foreground text-xs"
    //       title={String(row.original.updatedAt ?? row.original.createdAt ?? '')}
    //     >
    //       {formatUpdatedAt(row.original.updatedAt)}
    //     </span>
    //   ),
    //   header: () => 'Updated',
    // },
  ];
};

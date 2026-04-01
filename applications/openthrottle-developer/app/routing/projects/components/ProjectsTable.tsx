import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import type { ProjectCardFragment } from '~/__generated__/graphql';

function formatPlansTasksSummary(project: ProjectCardFragment): string {
  const planCount = project.plans?.length ?? 0;
  const taskCount = project.tasks?.length ?? 0;
  const parts: string[] = [];
  if (planCount !== 0) {
    parts.push(`${planCount} plan${planCount === 1 ? '' : 's'}`);
  }
  if (taskCount !== 0) {
    parts.push(`${taskCount} task${taskCount === 1 ? '' : 's'}`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

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
    <Card className={className} data-testid="ProjectsTable">
      <DataTable<ProjectCardFragment, string | null | undefined>
        columns={projectTableColumns}
        data={projects}
      />
    </Card>
  );
};

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
        <div className="w-full flex-1 overflow-hidden">
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
    header: () => 'Context',
  },
  {
    accessorKey: 'nxProjectName',
    cell: ({ row }) => {
      const nx = row.original.nxProjectName;
      return nx ? (
        <Badge size="xs" variant="secondary">
          {nx}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
    header: () => 'Project',
  },
  {
    accessorKey: 'plans',
    cell: ({ row }) => (
      <span className="tabular-nums text-xs">
        {formatPlansTasksSummary(row.original)}
      </span>
    ),
    header: () => 'Plans · Tasks',
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

import * as React from 'react';
import classnames from 'classnames';
import { Badge, Button, DataTable } from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import type { RoleRowFragment } from '~/__generated__/graphql';

export interface RolesTableProps {
  readonly className?: string;
  readonly roles: RoleRowFragment[];
}

export const RolesTable = (props: RolesTableProps): React.ReactElement => {
  const { className, roles } = props;

  // Hooks

  // Setup
  const columns = React.useMemo(() => RolesTable.buildTable(), [roles]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('bg-card border ui-border rounded-lg', className)}
      data-testid="RolesTable"
    >
      <DataTable<RoleRowFragment, string | number | null | undefined>
        columns={columns}
        data={roles}
        data-testid="RolesTable"
      />
    </div>
  );
};

RolesTable.buildTable = (): ColumnDef<
  RoleRowFragment,
  string | number | null | undefined
>[] => {
  return [
    {
      accessorKey: 'name',
      cell: ({ row }) => {
        const role = row.original;
        return (
          <Link
            aria-label={`View role: ${role.name}`}
            className="font-medium underline underline-offset-2 hover:text-primary"
            to={`/roles/${role.id}`}
            viewTransition={true}
          >
            {role.name}
          </Link>
        );
      },
      header: () => 'Name',
    },
    {
      accessorKey: 'description',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.description ?? '—'}
        </span>
      ),
      header: () => 'Description',
    },
    {
      accessorKey: 'permissions',
      cell: ({ row }) => {
        const perms = row.original.permissions;
        if (perms.length === 0) {
          return <span className="text-muted-foreground text-sm">None</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {perms.slice(0, 3).map((p) => (
              <Badge color="green" key={p.id} size="xs">
                {p.name}
              </Badge>
            ))}
            {perms.length > 3 ? (
              <Badge color="red" size="xs">
                +{perms.length - 3}
              </Badge>
            ) : null}
          </div>
        );
      },
      header: () => 'Permissions',
    },
    {
      accessorKey: 'updatedAt',
      cell: ({ row }) => formatDate(row.original.updatedAt, 'MMM d, yyyy'),
      header: () => 'Updated',
    },
    {
      cell: ({ row }) => {
        const role = row.original;
        return (
          <Button asChild={true} size="xs" variant="outline">
            <Link to={`/roles/${role.id}`} viewTransition={true}>
              View
            </Link>
          </Button>
        );
      },
      header: () => 'Actions',
      id: 'actions',
    },
  ];
};

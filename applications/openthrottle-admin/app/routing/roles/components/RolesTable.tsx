import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDate } from 'date-fns';
import type { RoleRowFragment } from '~/__generated__/graphql';

function buildRoleTableColumns(): ColumnDef<
  RoleRowFragment,
  string | number | null | undefined
>[] {
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
              <Badge key={p.id} variant="secondary">
                {p.name}
              </Badge>
            ))}
            {perms.length > 3 ? (
              <Badge variant="outline">+{perms.length - 3}</Badge>
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
}

interface RolesTableProps {
  readonly className?: string;
  readonly roles: RoleRowFragment[];
}

export const RolesTable = (props: RolesTableProps): React.ReactElement => {
  const { className, roles } = props;

  // Hooks

  // Setup
  const columns = React.useMemo(() => buildRoleTableColumns(), []);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={className} data-testid="RolesTable">
      <DataTable<RoleRowFragment, string | number | null | undefined>
        columns={columns}
        data={roles}
      />
    </Card>
  );
};

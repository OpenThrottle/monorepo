import * as React from 'react';
import classnames from 'classnames';
import { DataTable } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import type { PermissionRowFragment } from '~/__generated__/graphql';

export interface PermissionsTableProps {
  readonly className?: string;
  readonly permissions: PermissionRowFragment[];
}

export const PermissionsTable = (
  props: PermissionsTableProps,
): React.ReactElement => {
  const { className, permissions } = props;

  // Hooks

  // Setup
  const columns = React.useMemo(
    () => PermissionsTable.buildTable(),
    [permissions],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('bg-card ui-border rounded-lg border', className)}
      data-testid="PermissionsTable"
    >
      <DataTable<PermissionRowFragment, string | number | null | undefined>
        columns={columns}
        data={permissions}
      />
    </div>
  );
};

PermissionsTable.buildTable = (): ColumnDef<
  PermissionRowFragment,
  string | number | null | undefined
>[] => {
  return [
    {
      accessorKey: 'name',
      cell: ({ row }) => {
        const permission = row.original;
        return (
          <Link
            aria-label={`View roles with permission: ${permission.name}`}
            className="hover:text-primary font-medium underline underline-offset-2"
            to="/roles"
            viewTransition={true}
          >
            {permission.name}
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
      accessorKey: 'id',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.id}
        </span>
      ),
      header: () => 'ID',
    },
  ];
};

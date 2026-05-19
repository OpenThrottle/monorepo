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
import type { UserRowFragment } from '~/__generated__/graphql';

function buildUserTableColumns(): ColumnDef<
  UserRowFragment,
  string | number | null | undefined
>[] {
  return [
    {
      accessorKey: 'githubUsername',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Link
            aria-label={`View user: ${user.githubUsername}`}
            className="font-medium underline underline-offset-2 hover:text-primary"
            to={`/users/${user.id}`}
            viewTransition={true}
          >
            {user.githubUsername}
          </Link>
        );
      },
      header: () => 'GitHub',
    },
    {
      accessorKey: 'email',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.email ?? '—'}
        </span>
      ),
      header: () => 'Email',
    },
    {
      accessorKey: 'disabledAt',
      cell: ({ row }) => {
        const disabledAt = row.original.disabledAt;
        return disabledAt != null ? (
          <Badge variant="secondary">Disabled</Badge>
        ) : (
          <Badge variant="outline">Active</Badge>
        );
      },
      header: () => 'Status',
    },
    {
      accessorKey: 'createdAt',
      cell: ({ row }) => formatDate(row.original.createdAt, 'MMM d, yyyy'),
      header: () => 'Created',
    },
    {
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Button asChild={true} size="xs" variant="outline">
            <Link to={`/users/${user.id}`} viewTransition={true}>
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

interface UsersTableProps {
  readonly className?: string;
  readonly users: UserRowFragment[];
}

export const UsersTable = (props: UsersTableProps): React.ReactElement => {
  const { className, users } = props;

  // Hooks

  // Setup
  const columns = React.useMemo(() => buildUserTableColumns(), []);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={className} data-testid="UsersTable">
      <DataTable<UserRowFragment, string | number | null | undefined>
        columns={columns}
        data={users}
      />
    </Card>
  );
};

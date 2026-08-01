import * as React from 'react';
import { Form, Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge, Button, DataTable } from '@openthrottle/react-router-shadcn';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';

export interface RolloutFlagsTableProps {
  flags: RolloutFlagFieldsFragment[];
}

const flagDetailPath = (id: string): string => `/settings/rollout/${id}`;
const flagEditPath = (id: string): string => `/settings/rollout/${id}/edit`;

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const buildColumns = (): ColumnDef<RolloutFlagFieldsFragment, unknown>[] => [
  {
    accessorKey: 'key',
    cell: ({ row }) => (
      <Link
        className="font-medium underline-offset-2 hover:underline"
        to={flagDetailPath(row.original.id)}
      >
        {row.original.key}
      </Link>
    ),
    header: ROLLOUT_COPY.keyLabel,
  },
  {
    accessorKey: 'enabled',
    cell: ({ row }) => (
      <Badge variant={row.original.enabled ? 'default' : 'secondary'}>
        {row.original.enabled ? 'Enabled' : 'Disabled'}
      </Badge>
    ),
    header: ROLLOUT_COPY.enabledLabel,
  },
  {
    accessorKey: 'targetRoles',
    cell: ({ row }) => {
      const roles = row.original.targetRoles;
      if (roles.length === 0) {
        return <span className="text-muted-foreground">Everyone</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <Badge key={role} variant="outline">
              {role}
            </Badge>
          ))}
        </div>
      );
    },
    header: ROLLOUT_COPY.targetRolesLabel,
  },
  {
    accessorKey: 'updatedAt',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatTimestamp(row.original.updatedAt)}
      </span>
    ),
    header: 'Updated',
  },
  {
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button asChild={true} size="sm" type="button" variant="ghost">
          <Link to={flagEditPath(row.original.id)}>
            {ROLLOUT_COPY.editButton}
          </Link>
        </Button>
        <Form
          method="post"
          onSubmit={(event) => {
            if (!window.confirm(ROLLOUT_COPY.deleteConfirm)) {
              event.preventDefault();
            }
          }}
        >
          <input name="intent" type="hidden" value="deleteRolloutFlag" />
          <input name="id" type="hidden" value={row.original.id} />
          <Button size="sm" type="submit" variant="ghost">
            {ROLLOUT_COPY.deleteButton}
          </Button>
        </Form>
      </div>
    ),
    header: '',
    id: 'actions',
  },
];

/**
 * @description Lists rollout feature flags with key, state, targeting, last-updated,
 * and per-row edit/delete actions.
 */
export const RolloutFlagsTable = (
  props: RolloutFlagsTableProps,
): React.ReactElement => {
  const { flags } = props;

  // Hooks

  // Setup
  const columns = React.useMemo(() => buildColumns(), []);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DataTable
      columns={columns}
      data={flags}
      emptyState={ROLLOUT_COPY.emptyState}
      getRowId={(flag) => flag.id}
    />
  );
};

import * as React from 'react';
import { Form, Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge, Button, DataTable } from '@openthrottle/react-router-shadcn';
import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';
import {
  formatRolloutAllocationSummary,
  formatRolloutTimestamp,
  rolloutFlagDetailPath,
  rolloutFlagEditPath,
} from '~/routing/settings/utils/rollout-flag-format';

export interface RolloutFlagsTableProps {
  flags: RolloutFlagFieldsFragment[];
}

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
  const columns = React.useMemo<
    ColumnDef<RolloutFlagFieldsFragment, unknown>[]
  >(
    () => [
      {
        accessorKey: 'key',
        cell: ({ row }) => (
          <Link
            className="font-medium underline-offset-2 hover:underline"
            to={rolloutFlagDetailPath(row.original.id)}
          >
            {row.original.key}
          </Link>
        ),
        header: ROLLOUT_COPY.keyLabel,
      },
      {
        accessorKey: 'kind',
        cell: ({ row }) => <Badge variant="outline">{row.original.kind}</Badge>,
        header: ROLLOUT_COPY.kindLabel,
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
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {formatRolloutAllocationSummary(row.original)}
          </span>
        ),
        header: ROLLOUT_COPY.allocationLabel,
        id: 'allocation',
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
            {formatRolloutTimestamp(row.original.updatedAt)}
          </span>
        ),
        header: 'Updated',
      },
      {
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button asChild={true} size="sm" type="button" variant="ghost">
              <Link to={rolloutFlagEditPath(row.original.id)}>
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
    ],
    [],
  );

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

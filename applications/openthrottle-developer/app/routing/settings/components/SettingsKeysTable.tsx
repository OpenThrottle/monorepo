import * as React from 'react';
import clsx from 'clsx';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@openthrottle/react-router-shadcn';
import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';
import { SettingsKeysCredentialStatusBadge } from '~/routing/settings/components/SettingsKeysCredentialStatusBadge';
import { SettingsKeysRevokeCell } from '~/routing/settings/components/SettingsKeysRevokeCell';
import { SettingsKeysTableEmpty } from '~/routing/settings/components/SettingsKeysTableEmpty';
import {
  credentialDisplayName,
  credentialRowId,
  formatCredentialTimestamp,
  getSettingsKeysCredentialStatus,
} from '~/routing/settings/utils/settings-keys-credential';
import type { SettingsKeysCredentialStatus } from '~/routing/settings/utils/settings-keys-credential';

export interface SettingsKeysTableProps {
  actionError?: string | null;
  canRevoke?: boolean;
  className?: string;
  credentials?: readonly ServiceAccountCredentialFieldsFragment[];
}

export type { SettingsKeysCredentialStatus };
export { getSettingsKeysCredentialStatus };

export const SettingsKeysTable = (
  props: SettingsKeysTableProps,
): React.ReactElement => {
  const { actionError, canRevoke = false, className, credentials = [] } = props;

  // Hooks
  const columns = React.useMemo(
    () => SettingsKeysTable.buildTable(canRevoke),
    [canRevoke],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (credentials.length === 0 && !!actionError) {
    return (
      <div
        className={clsx('space-y-4', className)}
        data-testid="SettingsKeysTable"
      >
        <p
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          data-testid="SettingsKeysTable-action-error"
          role="alert"
        >
          {actionError}
        </p>
        <SettingsKeysTableEmpty />
      </div>
    );
  }

  return (
    <div
      className={clsx('space-y-4', className)}
      data-testid="SettingsKeysTable"
    >
      {actionError ? (
        <p
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          data-testid="SettingsKeysTable-action-error"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}
      <div className="ui-border rounded-lg border">
        <DataTable<ServiceAccountCredentialFieldsFragment, string | null>
          columns={columns}
          data={[...credentials]}
          emptyState={<SettingsKeysTableEmpty />}
          getRowId={credentialRowId}
        />
      </div>
    </div>
  );
};

SettingsKeysTable.buildTable = (
  canRevoke: boolean,
): ColumnDef<ServiceAccountCredentialFieldsFragment, string | null>[] => {
  return [
    {
      accessorKey: 'label',
      cell: ({ row }) => {
        const credential = row.original;
        const name = credentialDisplayName(credential);

        return (
          <div className="min-w-0 px-3 py-2">
            <p className="text-sm font-medium">{name}</p>
            {credential.label?.trim() ? (
              <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                {credential.prefix}
              </p>
            ) : null}
          </div>
        );
      },
      header: () => <div className="px-3 py-2 text-sm font-medium">Label</div>,
      id: 'label',
    },
    {
      accessorKey: 'prefix',
      cell: ({ row }) => (
        <span className="px-3 py-2 font-mono text-xs">
          {row.original.prefix}
        </span>
      ),
      header: () => <div className="px-3 py-2 text-sm font-medium">Prefix</div>,
      id: 'prefix',
    },
    {
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <span className="text-muted-foreground px-3 py-2 text-sm tabular-nums">
          {formatCredentialTimestamp(row.original.createdAt)}
        </span>
      ),
      header: () => (
        <div className="px-3 py-2 text-sm font-medium">Created</div>
      ),
      id: 'created',
    },
    {
      accessorKey: 'expiresAt',
      cell: ({ row }) => (
        <span className="text-muted-foreground px-3 py-2 text-sm tabular-nums">
          {formatCredentialTimestamp(row.original.expiresAt)}
        </span>
      ),
      header: () => (
        <div className="px-3 py-2 text-sm font-medium">Expires</div>
      ),
      id: 'expires',
    },
    {
      accessorKey: 'lastUsedAt',
      cell: ({ row }) => (
        <span className="text-muted-foreground px-3 py-2 text-sm tabular-nums">
          {formatCredentialTimestamp(row.original.lastUsedAt)}
        </span>
      ),
      header: () => (
        <div className="px-3 py-2 text-sm font-medium">Last used</div>
      ),
      id: 'lastUsed',
    },
    {
      cell: ({ row }) => (
        <div className="px-3 py-2">
          <SettingsKeysCredentialStatusBadge credential={row.original} />
        </div>
      ),
      header: () => <div className="px-3 py-2 text-sm font-medium">Status</div>,
      id: 'status',
    },
    {
      cell: ({ row }) => (
        <SettingsKeysRevokeCell
          canRevoke={canRevoke}
          credential={row.original}
        />
      ),
      header: () => (
        <div className="px-3 py-2 text-sm font-medium">Actions</div>
      ),
      id: 'actions',
    },
  ];
};

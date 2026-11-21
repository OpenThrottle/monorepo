import type { DataTableColumnDef } from '@openthrottle/react-router-shadcn';
import { Badge, cn, DataTable } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { OAuthGrantFieldsFragment } from '~/__generated__/graphql';
import { SettingsConnectionsRevokeCell } from '~/routing/settings/components/SettingsConnectionsRevokeCell';
import { SETTINGS_CONNECTIONS_COPY as COPY } from '~/routing/settings/data/data.copy';
import { formatCredentialTimestamp } from '~/routing/settings/utils/settings-keys-credential';

export interface SettingsConnectionsTableProps {
  className?: string;
  connections: readonly OAuthGrantFieldsFragment[];
}

export const SettingsConnectionsTable = (
  props: SettingsConnectionsTableProps,
): React.ReactElement => {
  const { className, connections } = props;

  // Hooks
  const columns = React.useMemo(
    () => SettingsConnectionsTable.buildTable(),
    [],
  );

  // Setup

  // Handlers

  // Markup
  const emptyState = (
    <p className="text-muted-foreground px-3 py-8 text-center text-sm">
      {COPY.empty}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('ui-border rounded-lg border', className)}
      data-testid="SettingsConnectionsTable"
    >
      <DataTable<OAuthGrantFieldsFragment, string | null>
        columns={columns}
        data={[...connections]}
        emptyState={emptyState}
        getRowId={(row) => row.id}
      />
    </div>
  );
};

SettingsConnectionsTable.buildTable = (): DataTableColumnDef<
  OAuthGrantFieldsFragment,
  string | null
>[] => {
  const header = (label: string): React.ReactElement => {
    return <div className="px-3 py-2 text-sm font-medium">{label}</div>;
  };
  const timestamp = (value: unknown): React.ReactElement => {
    return (
      <span className="text-muted-foreground px-3 py-2 text-sm whitespace-nowrap tabular-nums">
        {formatCredentialTimestamp(value)}
      </span>
    );
  };
  const accessLabel = (scopes: readonly string[]): string => {
    return scopes.includes('mcp:write')
      ? COPY.accessReadWrite
      : COPY.accessRead;
  };

  return [
    {
      accessorKey: 'clientName',
      cell: ({ row }) => (
        <div className="min-w-0 px-3 py-2">
          <p className="text-sm font-medium">
            {row.original.clientName ?? row.original.clientHost}
          </p>
          <p className="text-muted-foreground mt-0.5 font-mono text-xs">
            {row.original.clientHost}
          </p>
        </div>
      ),
      header: () => header(COPY.columnApp),
      id: 'app',
    },
    {
      accessorKey: 'scopes',
      cell: ({ row }) => (
        <div className="px-3 py-2">
          <Badge variant="outline">{accessLabel(row.original.scopes)}</Badge>
        </div>
      ),
      header: () => header(COPY.columnAccess),
      id: 'access',
    },
    {
      accessorKey: 'lastUsedAt',
      cell: ({ row }) => timestamp(row.original.lastUsedAt),
      header: () => header(COPY.columnLastUsed),
      id: 'lastUsed',
    },
    {
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <div className="px-3 py-2 whitespace-nowrap">
          <p className="text-muted-foreground text-sm tabular-nums">
            {formatCredentialTimestamp(row.original.createdAt)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
            {COPY.expiresPrefix}
            {formatCredentialTimestamp(row.original.expiresAt)}
          </p>
        </div>
      ),
      header: () => header(COPY.columnConnected),
      id: 'connected',
    },
    {
      accessorKey: 'id',
      cell: ({ row }) => (
        <SettingsConnectionsRevokeCell
          appName={row.original.clientName ?? row.original.clientHost}
          grantId={row.original.id}
        />
      ),
      header: () => <span className="sr-only">{COPY.revoke}</span>,
      id: 'revoke',
    },
  ];
};

import * as React from 'react';
import classnames from 'classnames';
import { formatDate } from 'date-fns';
import { KeyRoundIcon } from 'lucide-react';
import { useFetcher, useRevalidator } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  DataTable,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
  Input,
  toast,
  type BadgeProps,
} from '@openthrottle/react-router-shadcn';
import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';
import { action as settingsKeysAction } from '~/routes/settings.keys';

export interface SettingsKeysTableProps {
  actionError?: string | null;
  canRevoke?: boolean;
  className?: string;
  credentials?: readonly ServiceAccountCredentialFieldsFragment[];
}

export type SettingsKeysCredentialStatus = 'active' | 'expired' | 'revoked';

const SETTINGS_KEYS_TABLE_DATE_FORMAT = 'MMM d, yyyy';

const credentialStatusLabels: Record<SettingsKeysCredentialStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
};

const credentialStatusBadgeColor: Record<
  SettingsKeysCredentialStatus,
  BadgeProps['color']
> = {
  active: 'green',
  expired: 'amber',
  revoked: 'slate',
};

/**
 * @description Derives credential lifecycle status for table badges and revoke eligibility.
 */
export const getSettingsKeysCredentialStatus = (
  credential: Pick<
    ServiceAccountCredentialFieldsFragment,
    'expiresAt' | 'revokedAt'
  >,
): SettingsKeysCredentialStatus => {
  if (credential.revokedAt != null) {
    return 'revoked';
  }
  if (credential.expiresAt != null) {
    const expires = new Date(credential.expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) {
      return 'expired';
    }
  }
  return 'active';
};

const formatCredentialTimestamp = (value: unknown): string => {
  if (value == null) {
    return '—';
  }
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return formatDate(date, SETTINGS_KEYS_TABLE_DATE_FORMAT);
};

const credentialRowId = (
  credential: ServiceAccountCredentialFieldsFragment,
): string => credential.id;

const credentialDisplayName = (
  credential: ServiceAccountCredentialFieldsFragment,
): string => credential.label?.trim() || credential.prefix;

interface SettingsKeysCredentialStatusBadgeProps {
  credential: ServiceAccountCredentialFieldsFragment;
}

const SettingsKeysCredentialStatusBadge = (
  props: SettingsKeysCredentialStatusBadgeProps,
): React.ReactElement => {
  const { credential } = props;
  const status = getSettingsKeysCredentialStatus(credential);

  return (
    <Badge
      color={credentialStatusBadgeColor[status]}
      data-testid={`SettingsKeysTable-status-${credential.id}`}
      size="xs"
    >
      {credentialStatusLabels[status]}
    </Badge>
  );
};

interface SettingsKeysRevokeCellProps {
  canRevoke: boolean;
  credential: ServiceAccountCredentialFieldsFragment;
}

const SettingsKeysRevokeCell = (
  props: SettingsKeysRevokeCellProps,
): React.ReactElement | null => {
  const { canRevoke, credential } = props;

  // Hooks
  const revokeBusyRef = React.useRef(false);
  const fetcher = useFetcher<typeof settingsKeysAction>();
  const revalidator = useRevalidator();
  const [open, setOpen] = React.useState(false);

  // Setup
  const RevokeForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';
  const status = getSettingsKeysCredentialStatus(credential);
  const displayName = credentialDisplayName(credential);

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';

    if (revokeBusyRef.current && !busy) {
      const data = fetcher.data;

      if (data != null && typeof data === 'object') {
        if ('ok' in data && data.ok === true) {
          toast.success('Credential revoked.');
          revalidator.revalidate();
          setOpen(false);
        } else if ('error' in data && typeof data.error === 'string') {
          toast.error(data.error);
        }
      }
    }
    revokeBusyRef.current = busy;
  }, [fetcher.state, fetcher.data, revalidator]);

  // 🔌 Short Circuit
  if (status !== 'active') {
    return <span className="px-3 py-2 text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="px-3 py-2">
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogTrigger asChild={true}>
          <Button
            aria-label={`Revoke credential ${displayName}`}
            data-testid={`SettingsKeysTable-revoke-trigger-${credential.id}`}
            disabled={!canRevoke || isSubmitting}
            size="xs"
            type="button"
            variant="outline"
          >
            {isSubmitting ? 'Revoking…' : 'Revoke'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke credential?</AlertDialogTitle>
            <AlertDialogDescription>
              Revoking &quot;{displayName}&quot; ({credential.prefix}) stops
              this token from authenticating on the next request. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <RevokeForm action="/settings/keys" method="post">
            <Input name="intent" type="hidden" value="revokeCredential" />
            <Input name="credentialId" type="hidden" value={credential.id} />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting} type="button">
                Cancel
              </AlertDialogCancel>
              <Button
                data-testid={`SettingsKeysTable-revoke-submit-${credential.id}`}
                disabled={!canRevoke || isSubmitting}
                type="submit"
                variant="destructive"
              >
                {isSubmitting ? 'Revoking…' : 'Revoke'}
              </Button>
            </AlertDialogFooter>
          </RevokeForm>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const SettingsKeysTableEmpty = (): React.ReactElement => (
  <Empty data-testid="SettingsKeysTable-empty">
    <EmptyMedia variant="icon">
      <KeyRoundIcon className="size-6" />
    </EmptyMedia>
    <EmptyTitle>No credentials yet</EmptyTitle>
    <EmptyDescription>
      Create a credential to get a one-time bearer token for MCP, Ralph workers,
      or CI. Existing secrets are never shown again after creation.
    </EmptyDescription>
  </Empty>
);

export const SettingsKeysTable = (props: SettingsKeysTableProps) => {
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
  if (credentials.length === 0) {
    return (
      <div
        className={classnames('space-y-4', className)}
        data-testid="SettingsKeysTable"
      >
        {actionError ? (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            data-testid="SettingsKeysTable-action-error"
            role="alert"
          >
            {actionError}
          </p>
        ) : null}
        <SettingsKeysTableEmpty />
      </div>
    );
  }

  return (
    <div
      className={classnames('space-y-4', className)}
      data-testid="SettingsKeysTable"
    >
      {actionError ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-testid="SettingsKeysTable-action-error"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}
      <div className="border ui-border rounded-lg">
        <DataTable<ServiceAccountCredentialFieldsFragment, string | null>
          columns={columns}
          data={[...credentials]}
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
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
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
        <span className="px-3 py-2 text-sm tabular-nums text-muted-foreground">
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
        <span className="px-3 py-2 text-sm tabular-nums text-muted-foreground">
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
        <span className="px-3 py-2 text-sm tabular-nums text-muted-foreground">
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

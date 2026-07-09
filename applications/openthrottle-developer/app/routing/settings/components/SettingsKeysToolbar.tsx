import * as React from 'react';
import clsx from 'clsx';
import { PlusIcon } from 'lucide-react';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import type { ServiceAccountListItemFragment } from '~/__generated__/graphql';

export interface SettingsKeysToolbarProps {
  canCreate?: boolean;
  className?: string;
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
  onServiceAccountChange?: (serviceAccountId: string) => void;
  selectedServiceAccountId?: string | null;
  serviceAccounts?: readonly ServiceAccountListItemFragment[];
}

/**
 * @description Account picker (when multiple) and primary control to open the create-credential dialog.
 */
export const SettingsKeysToolbar = (
  props: SettingsKeysToolbarProps,
): React.ReactElement => {
  const {
    canCreate = false,
    className,
    createDialogOpen: _createDialogOpen,
    onCreateDialogOpenChange,
    onServiceAccountChange,
    selectedServiceAccountId,
    serviceAccounts = [],
  } = props;

  // Hooks

  // Setup
  const enabledAccounts = serviceAccounts.filter(
    (account) => account.disabledAt == null,
  );
  const showAccountPicker = enabledAccounts.length > 1;
  const noAccounts = enabledAccounts.length === 0;
  const createDisabled = !canCreate || noAccounts;

  // Handlers
  const handleAccountChange = (value: string): void => {
    onServiceAccountChange?.(value);
  };

  const handleCreateClick = (): void => {
    onCreateDialogOpenChange?.(true);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'flex flex-wrap items-end justify-between gap-4',
        className,
      )}
      data-testid="SettingsKeysToolbar"
    >
      {showAccountPicker ? (
        <div className="flex min-w-[12rem] flex-col gap-2">
          <Label htmlFor="settings-keys-service-account">Service account</Label>
          <Select
            onValueChange={handleAccountChange}
            value={selectedServiceAccountId ?? undefined}
          >
            <SelectTrigger
              aria-label="Service account"
              className="w-full max-w-xs"
              data-testid="SettingsKeysToolbar-account-select"
              id="settings-keys-service-account"
            >
              <SelectValue placeholder="Select service account" />
            </SelectTrigger>
            <SelectContent>
              {enabledAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="text-muted-foreground min-w-0 flex-1 text-sm">
          {noAccounts ? (
            <p data-testid="SettingsKeysToolbar-no-accounts">
              No service accounts are available. Bootstrap accounts via{' '}
              <code className="text-xs">
                database:bootstrap-service-accounts
              </code>
              .
            </p>
          ) : (
            <p>
              <span className="text-foreground font-medium">Account:</span>{' '}
              {enabledAccounts[0]?.name ?? '—'}
            </p>
          )}
        </div>
      )}

      <Button
        data-testid="SettingsKeysToolbar-create-button"
        disabled={createDisabled}
        onClick={handleCreateClick}
        type="button"
        variant="default"
      >
        <PlusIcon aria-hidden={true} className="size-4" />
        Create credential
      </Button>
    </div>
  );
};

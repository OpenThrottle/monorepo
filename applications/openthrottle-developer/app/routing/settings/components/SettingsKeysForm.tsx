import {
  Button,
  cn,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Form } from 'react-router';

import { SettingsKeysFormSuccess } from '~/routing/settings/components/SettingsKeysFormSuccess';
import { useSettingsKeysForm } from '~/routing/settings/hooks/useSettingsKeysForm';
import type { SettingsKeysCreateCredentialActionData } from '~/routing/settings/types';
import type { SettingsKeysActionData } from '~/routing/settings/utils/settings-keys-action';

export interface SettingsKeysFormProps {
  actionData?: Extract<
    SettingsKeysActionData,
    { intent: 'createCredential' }
  > | null;
  className?: string;
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
  serviceAccountId?: string | null;
}

/**
 * @description Create-credential dialog: form fields and one-time token display after success.
 */
export const SettingsKeysForm = (
  props: SettingsKeysFormProps,
): React.ReactElement => {
  const {
    actionData,
    className,
    createDialogOpen = false,
    onCreateDialogOpenChange,
    serviceAccountId,
  } = props;

  // Hooks
  const {
    canSubmit,
    expiresAt,
    handleCopyToken,
    handleDone,
    handleOpenChange,
    isSubmitting,
    setExpiresAt,
    showSuccess,
    successPayload,
  } = useSettingsKeysForm({
    actionData,
    onCreateDialogOpenChange,
    serviceAccountId,
  });

  // Setup
  const hasSuccess = showSuccess && successPayload != null;
  const hasExpiry = expiresAt != null;

  // Handlers

  // Markup
  const renderSuccess = (
    payload: SettingsKeysCreateCredentialActionData,
  ): React.ReactElement => {
    return (
      <SettingsKeysFormSuccess
        onCopyToken={handleCopyToken}
        onDone={handleDone}
        payload={payload}
      />
    );
  };
  const expiresInput = (
    <input name="expiresAt" type="hidden" value={expiresAt?.toISOString()} />
  );
  const clearExpiryButton = (
    <Button
      className="h-auto px-0 text-xs"
      onClick={() => {
        setExpiresAt(undefined);
      }}
      type="button"
      variant="link"
    >
      Clear expiry
    </Button>
  );
  const createForm = (
    <>
      <DialogHeader>
        <DialogTitle>Create credential</DialogTitle>
        <DialogDescription>
          Issue a new long-lived bearer token for the selected service account.
          The full secret is shown only once after creation.
        </DialogDescription>
      </DialogHeader>

      <Form action="/settings/keys" className="space-y-4" method="post">
        <input name="intent" type="hidden" value="createCredential" />
        <input
          name="serviceAccountId"
          type="hidden"
          value={serviceAccountId ?? ''}
        />

        {hasExpiry ? expiresInput : null}

        <div className="space-y-2">
          <Label htmlFor="settings-keys-credential-label">
            Label (optional)
          </Label>
          <Input
            autoComplete="off"
            data-testid="SettingsKeysForm-label-input"
            id="settings-keys-credential-label"
            name="label"
            placeholder="CI deploy, local MCP, …"
            type="text"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-keys-credential-expires">
            Expires (optional)
          </Label>
          <DatePicker
            className="w-full max-w-none"
            disabled={!canSubmit}
            onSelect={setExpiresAt}
            placeholder="No expiry"
            value={expiresAt}
          />
          {hasExpiry ? clearExpiryButton : null}
        </div>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={() => {
              handleOpenChange(false);
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            data-testid="SettingsKeysForm-submit-button"
            disabled={!canSubmit}
            type="submit"
          >
            {isSubmitting ? 'Creating…' : 'Create credential'}
          </Button>
        </DialogFooter>
      </Form>
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={handleOpenChange} open={createDialogOpen}>
      <DialogContent
        className={cn('sm:max-w-lg', className)}
        data-testid="SettingsKeysForm"
      >
        {hasSuccess ? renderSuccess(successPayload) : createForm}
      </DialogContent>
    </Dialog>
  );
};

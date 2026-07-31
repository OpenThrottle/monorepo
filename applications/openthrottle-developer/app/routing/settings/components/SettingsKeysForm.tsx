import * as React from 'react';
import clsx from 'clsx';
import { Form } from 'react-router';
import {
  Button,
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
import { SettingsKeysFormSuccess } from '~/routing/settings/components/SettingsKeysFormSuccess';
import { useSettingsKeysForm } from '~/routing/settings/hooks/useSettingsKeysForm';
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

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={handleOpenChange} open={createDialogOpen}>
      <DialogContent
        className={clsx('sm:max-w-lg', className)}
        data-testid="SettingsKeysForm"
      >
        {showSuccess && successPayload != null ? (
          <SettingsKeysFormSuccess
            onCopyToken={handleCopyToken}
            onDone={handleDone}
            payload={successPayload}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create credential</DialogTitle>
              <DialogDescription>
                Issue a new long-lived bearer token for the selected service
                account. The full secret is shown only once after creation.
              </DialogDescription>
            </DialogHeader>

            <Form action="/settings/keys" className="space-y-4" method="post">
              <input name="intent" type="hidden" value="createCredential" />
              <input
                name="serviceAccountId"
                type="hidden"
                value={serviceAccountId ?? ''}
              />

              {expiresAt != null ? (
                <input
                  name="expiresAt"
                  type="hidden"
                  value={expiresAt.toISOString()}
                />
              ) : null}

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
                {expiresAt != null ? (
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
                ) : null}
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
        )}
      </DialogContent>
    </Dialog>
  );
};

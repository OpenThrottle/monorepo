import * as React from 'react';
import classnames from 'classnames';
import { CopyIcon } from 'lucide-react';
import { Form, useNavigation, useRevalidator } from 'react-router';
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
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Label,
  toast,
} from '@openthrottle/react-router-shadcn';
import type { SettingsKeysActionData } from '~/routing/settings/utils/settings-keys-action';
import { copyText } from '~/routing/settings/utils/settings.support';

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
export const SettingsKeysForm = (props: SettingsKeysFormProps) => {
  const {
    actionData,
    className,
    createDialogOpen = false,
    onCreateDialogOpenChange,
    serviceAccountId,
  } = props;

  // Hooks
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>(undefined);
  const [dismissedSuccessCredentialId, setDismissedSuccessCredentialId] =
    React.useState<string | null>(null);
  const revalidatedCredentialIdRef = React.useRef<string | null>(null);

  // Setup
  const isSubmitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'createCredential';
  const successPayload =
    actionData?.token != null && actionData.credential != null
      ? actionData
      : null;
  const showSuccess =
    successPayload != null &&
    successPayload.credential.id !== dismissedSuccessCredentialId;
  const canSubmit = serviceAccountId != null && !isSubmitting;

  // Handlers
  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      if (successPayload != null) {
        setDismissedSuccessCredentialId(successPayload.credential.id);
      }
      setExpiresAt(undefined);
    }
    onCreateDialogOpenChange?.(open);
  };

  const handleCopyToken = async (): Promise<void> => {
    if (!successPayload?.token) {
      return;
    }

    const copied = await copyText(successPayload.token);
    if (copied) {
      toast.success('Credential token copied to clipboard');
    } else {
      toast.error('Could not copy token to clipboard');
    }
  };

  const handleDone = (): void => {
    handleOpenChange(false);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const credentialId = successPayload?.credential.id;
    if (credentialId == null) {
      return;
    }
    if (revalidatedCredentialIdRef.current === credentialId) {
      return;
    }
    revalidatedCredentialIdRef.current = credentialId;
    revalidator.revalidate();
  }, [successPayload?.credential.id, revalidator]);

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={handleOpenChange} open={createDialogOpen}>
      <DialogContent
        className={classnames('sm:max-w-lg', className)}
        data-testid="SettingsKeysForm"
      >
        {showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Credential created</DialogTitle>
              <DialogDescription>
                Copy this bearer token now. It is shown once and cannot be
                retrieved again from the portal.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-50">
                Store the token in{' '}
                <code className="text-xs">MCP_DEVELOPER_AUTH_TOKEN</code> or
                your worker environment before closing this dialog.
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-keys-created-token">Token</Label>
                <InputGroup>
                  <InputGroupInput
                    aria-label="One-time credential token"
                    className="font-mono text-xs"
                    data-testid="SettingsKeysForm-token-input"
                    id="settings-keys-created-token"
                    readOnly={true}
                    value={successPayload.token}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label="Copy credential token"
                      data-testid="SettingsKeysForm-copy-token"
                      onClick={() => {
                        void handleCopyToken();
                      }}
                      type="button"
                      variant="outline"
                    >
                      <CopyIcon aria-hidden={true} className="size-4" />
                      Copy
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>

              {successPayload.credential.label?.trim() ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Label:</span>{' '}
                  {successPayload.credential.label}
                </p>
              ) : null}
              <p className="font-mono text-xs text-muted-foreground">
                Prefix: {successPayload.credential.prefix}
              </p>
            </div>

            <DialogFooter>
              <Button
                data-testid="SettingsKeysForm-done-button"
                onClick={handleDone}
                type="button"
              >
                Done
              </Button>
            </DialogFooter>
          </>
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

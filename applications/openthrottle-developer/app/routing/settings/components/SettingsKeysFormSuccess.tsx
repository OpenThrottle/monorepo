import * as React from 'react';
import {
  Button,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Label,
} from '@openthrottle/react-router-shadcn';
import { CopyIcon } from 'lucide-react';
import type { SettingsKeysCreateCredentialActionData } from '~/routing/settings/hooks/useSettingsKeysForm';

export interface SettingsKeysFormSuccessProps {
  onCopyToken: () => Promise<void>;
  onDone: () => void;
  payload: SettingsKeysCreateCredentialActionData;
}

/**
 * @description Post-create success body for the create-credential dialog: the
 * one-time token with a copy control, credential metadata, and Done. Split out
 * of SettingsKeysForm (component-primitive-shape R6).
 */
export const SettingsKeysFormSuccess = (
  props: SettingsKeysFormSuccessProps,
): React.ReactElement => {
  const { onCopyToken, onDone, payload } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <DialogHeader>
        <DialogTitle>Credential created</DialogTitle>
        <DialogDescription>
          Copy this bearer token now. It is shown once and cannot be retrieved
          again from the portal.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-50">
          Store the token in{' '}
          <code className="text-xs">OPENTHROTTLE_MCP_AUTH_TOKEN</code> or your
          worker environment before closing this dialog.
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
              value={payload.token}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Copy credential token"
                data-testid="SettingsKeysForm-copy-token"
                onClick={() => {
                  void onCopyToken();
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

        {payload.credential.label?.trim() ? (
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-medium">Label:</span>{' '}
            {payload.credential.label}
          </p>
        ) : null}
        <p className="text-muted-foreground font-mono text-xs">
          Prefix: {payload.credential.prefix}
        </p>
      </div>

      <DialogFooter>
        <Button
          data-testid="SettingsKeysForm-done-button"
          onClick={onDone}
          type="button"
        >
          Done
        </Button>
      </DialogFooter>
    </>
  );
};

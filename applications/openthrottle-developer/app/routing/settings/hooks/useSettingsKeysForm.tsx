import * as React from 'react';
import { toast } from '@openthrottle/react-router-shadcn';
import { useNavigation, useRevalidator } from 'react-router';
import type { SettingsKeysActionData } from '~/routing/settings/utils/settings-keys-action';
import { copyText } from '~/routing/settings/utils/settings.support';

/** The create-credential slice of the settings/keys action payload. */
export type SettingsKeysCreateCredentialActionData = Extract<
  SettingsKeysActionData,
  { intent: 'createCredential' }
>;

export interface SettingsKeysFormOptions {
  actionData?: SettingsKeysCreateCredentialActionData | null;
  onCreateDialogOpenChange?: (open: boolean) => void;
  serviceAccountId?: string | null;
}

export interface UseSettingsKeysFormResult {
  canSubmit: boolean;
  expiresAt: Date | undefined;
  handleCopyToken: () => Promise<void>;
  handleDone: () => void;
  handleOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  setExpiresAt: React.Dispatch<React.SetStateAction<Date | undefined>>;
  showSuccess: boolean;
  successPayload: SettingsKeysCreateCredentialActionData | null;
}

/**
 * @description Submission state, one-time-token success tracking, and dialog
 * open/copy/done handlers for the create-credential dialog. Extracted from
 * SettingsKeysForm per component-primitive-shape R6/R7.
 */
export const useSettingsKeysForm = (
  options: SettingsKeysFormOptions,
): UseSettingsKeysFormResult => {
  const { actionData, onCreateDialogOpenChange, serviceAccountId } = options;

  // Hooks
  const navigation = useNavigation();
  const refCredentialId = React.useRef<string | null>(null);
  const revalidator = useRevalidator();
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>(undefined);
  const [dismissedCredentialId, setDismissedCredentialId] = React.useState<
    string | null
  >(null);

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
    successPayload.credential.id !== dismissedCredentialId;
  const canSubmit = serviceAccountId != null && !isSubmitting;

  // Handlers
  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      if (successPayload != null) {
        setDismissedCredentialId(successPayload.credential.id);
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

    if (refCredentialId.current === credentialId) {
      return;
    }

    refCredentialId.current = credentialId;
    revalidator.revalidate();
  }, [successPayload?.credential.id, revalidator]);

  console.log('dismissedCredentialId', dismissedCredentialId);

  // 🔌 Short Circuit

  return {
    canSubmit,
    expiresAt,
    handleCopyToken,
    handleDone,
    handleOpenChange,
    isSubmitting,
    setExpiresAt,
    showSuccess,
    successPayload,
  };
};

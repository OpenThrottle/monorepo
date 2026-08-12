import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  CreateServiceAccountCredentialDocument,
  RevokeServiceAccountCredentialDocument,
} from '~/__generated__/graphql';
import { toErrorMessage } from '~/global/utils/utils.error-message';
import {
  parseCredentialIdFromFormData,
  parseExpiresAtFromFormData,
  parseServiceAccountIdFromFormData,
  type SettingsKeysActionData,
} from '~/routing/settings/utils/settings-keys-action';
import { optionalTrimmedString } from '~/routing/settings/utils/workspace-settings-action';
import type { Route } from '@/app/routes/+types/settings.keys';

export const createServiceAccountCredential = async (
  args: Route.ActionArgs,
  formData: FormData,
): Promise<SettingsKeysActionData> => {
  const serviceAccountId = parseServiceAccountIdFromFormData(
    formData.get('serviceAccountId'),
  );
  const label = optionalTrimmedString(formData.get('label'));
  const expiresAt = parseExpiresAtFromFormData(formData.get('expiresAt'));

  if (!serviceAccountId) {
    return { error: 'Service account is required.' };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      CreateServiceAccountCredentialDocument,
      {
        input: {
          expiresAt: expiresAt ?? null,
          label: label ?? null,
          serviceAccountId,
        },
      },
    );

    const result = data.createServiceAccountCredential;
    if (!result?.token || !result.credential) {
      return { error: 'Failed to create credential.' };
    }

    return {
      credential: result.credential,
      intent: 'createCredential',
      token: result.token,
    };
  } catch (error) {
    return { error: toErrorMessage(error, 'Failed to create credential.') };
  }
};

export const revokeServiceAccountCredential = async (
  args: Route.ActionArgs,
  formData: FormData,
): Promise<SettingsKeysActionData> => {
  const credentialId = parseCredentialIdFromFormData(
    formData.get('credentialId'),
  );

  if (!credentialId) {
    return { error: 'Credential id is required.' };
  }

  try {
    await executeGraphqlWithAuth(
      args.request,
      RevokeServiceAccountCredentialDocument,
      { credentialId },
    );
    return { ok: true };
  } catch (error) {
    return { error: toErrorMessage(error, 'Failed to revoke credential.') };
  }
};

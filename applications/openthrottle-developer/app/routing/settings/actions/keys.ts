import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';
import { CreateServiceAccountCredentialInputSchema } from '~/__generated__/schemas';
import {
  CreateServiceAccountCredentialDocument,
  RevokeServiceAccountCredentialDocument,
} from '~/__generated__/graphql';
import { toErrorMessage } from '~/global/utils/utils.error-message';
import {
  parseExpiresAtFromFormData,
  type SettingsKeysActionData,
} from '~/routing/settings/utils/settings-keys-action';
import type { Route } from '@/app/routes/+types/settings.keys';

export const createServiceAccountCredential = async (
  args: Route.ActionArgs,
  formData: FormData,
): Promise<SettingsKeysActionData> => {
  const parsed = parseFormData(
    formData,
    CreateServiceAccountCredentialInputSchema().omit({ expiresAt: true }),
    { strict: false },
  );
  if (!parsed.success) {
    return { error: 'Service account is required.' };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      CreateServiceAccountCredentialDocument,
      {
        input: {
          expiresAt:
            parseExpiresAtFromFormData(formData.get('expiresAt')) ?? null,
          label: parsed.data.label ?? null,
          serviceAccountId: parsed.data.serviceAccountId,
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
  const parsed = parseFormData(
    formData,
    z.object({ credentialId: z.string().min(1) }),
    { strict: false },
  );
  if (!parsed.success) {
    return { error: 'Credential id is required.' };
  }

  try {
    await executeGraphqlWithAuth(
      args.request,
      RevokeServiceAccountCredentialDocument,
      { credentialId: parsed.data.credentialId },
    );
    return { ok: true };
  } catch (error) {
    return { error: toErrorMessage(error, 'Failed to revoke credential.') };
  }
};

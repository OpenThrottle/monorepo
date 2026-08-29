import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';
import { UpdateWorkspaceProfileInputSchema } from '~/__generated__/schemas';
import {
  ApplyWorkspaceEditorConfigurationDocument,
  UpdateWorkspaceProfileDocument,
} from '~/__generated__/graphql';
import { formatEditorConfigApplyMessage } from '~/routing/settings/utils/format-editor-config-result';
import { parseEnabledEditorsFromFormData } from '~/routing/settings/utils/workspace-settings-action';
import type { Route } from '@/app/routes/+types/settings.workspace._index';

export const updateProfile = async (
  args: Route.ActionArgs,
  formData: FormData,
) => {
  const parsed = parseFormData(
    formData,
    UpdateWorkspaceProfileInputSchema().omit({ enabledEditors: true }),
    { strict: false },
  );
  if (!parsed.success) {
    return { error: parsed.error };
  }

  try {
    await executeGraphqlWithAuth(args.request, UpdateWorkspaceProfileDocument, {
      input: {
        contactDisplayName: parsed.data.contactDisplayName ?? null,
        contactEmail: parsed.data.contactEmail ?? null,
        enabledEditors: parseEnabledEditorsFromFormData(formData),
      },
    });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update profile.';
    return { error: message };
  }
};

export const applyEditorConfig = async (
  args: Route.ActionArgs,
  formData: FormData,
) => {
  const parsed = parseFormData(
    formData,
    z.object({ repositoryId: z.string().nullish() }),
    { strict: false },
  );
  const repositoryId = parsed.success
    ? (parsed.data.repositoryId ?? null)
    : null;

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      ApplyWorkspaceEditorConfigurationDocument,
      {
        input: repositoryId ? { repositoryIds: [repositoryId] } : {},
      },
    );
    return {
      applications: data.applyWorkspaceEditorConfiguration.applications,
      message: formatEditorConfigApplyMessage(data),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to apply editor configuration.';
    return { error: message };
  }
};

import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  ApplyWorkspaceEditorConfigurationDocument,
  UpdateWorkspaceProfileDocument,
} from '~/__generated__/graphql';
import { formatEditorConfigApplyMessage } from '~/routing/settings/utils/format-editor-config-result';
import {
  optionalTrimmedString,
  parseEnabledEditorsFromFormData,
} from '~/routing/settings/utils/workspace-settings-action';
import type { Route } from '@/app/routes/+types/settings.workspace._index';

export const updateProfile = async (
  args: Route.ActionArgs,
  formData: FormData,
) => {
  const contactDisplayName = optionalTrimmedString(
    formData.get('contactDisplayName'),
  );
  const contactEmail = optionalTrimmedString(formData.get('contactEmail'));
  const enabledEditors = parseEnabledEditorsFromFormData(formData);

  try {
    await executeGraphqlWithAuth(args.request, UpdateWorkspaceProfileDocument, {
      input: {
        contactDisplayName,
        contactEmail,
        enabledEditors,
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
  const repositoryId = optionalTrimmedString(formData.get('repositoryId'));

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      ApplyWorkspaceEditorConfigurationDocument,
      {
        input: repositoryId ? { repositoryIds: [repositoryId] } : {},
      },
    );
    return { message: formatEditorConfigApplyMessage(data) };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to apply editor configuration.';
    return { error: message };
  }
};

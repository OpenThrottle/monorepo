import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  AddWorkspaceFolderDocument,
  BrowseWorkspaceDirectoryDocument,
  CloneRepositoryDocument,
  DeleteWorkspaceLocalRepositoryDocument,
  PickFolderNativeDocument,
  RefreshCheckoutDocument,
} from '~/__generated__/graphql';
import { optionalTrimmedString } from '~/routing/settings/utils/workspace-settings-action';
import type { Route } from '@/app/routes/+types/settings.repositories._index';

export const addFolder = async (args: Route.ActionArgs, formData: FormData) => {
  const path = optionalTrimmedString(formData.get('path'));
  const displayName = optionalTrimmedString(formData.get('displayName'));

  if (!path) {
    return { error: 'A folder path is required.' };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      AddWorkspaceFolderDocument,
      { input: { displayName: displayName ?? null, path } },
    );
    return { addedFolder: data.addWorkspaceFolder };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to add folder.';
    return { error: message };
  }
};

export const cloneRepo = async (args: Route.ActionArgs, formData: FormData) => {
  const gitUrl = optionalTrimmedString(formData.get('gitUrl'));
  const name = optionalTrimmedString(formData.get('name'));

  if (!gitUrl) {
    return { error: 'A git repository URL is required.' };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      CloneRepositoryDocument,
      { input: { gitUrl, name: name ?? null } },
    );
    return { addedFolder: data.cloneRepository };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to clone repository.';
    return { error: message };
  }
};

export const browseDirectory = async (
  args: Route.ActionArgs,
  formData: FormData,
) => {
  // An empty/omitted path lists the configured roots (zero-typing seed).
  const path = optionalTrimmedString(formData.get('path')) ?? null;

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      BrowseWorkspaceDirectoryDocument,
      { path },
    );
    return { browse: data.browseDirectory };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to browse directory.';
    return { error: message };
  }
};

export const pickFolderNative = async (args: Route.ActionArgs) => {
  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      PickFolderNativeDocument,
    );
    return { picked: { path: data.pickFolderNative.path } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to open the folder dialog.';
    return { error: message };
  }
};

export const refreshCheckout = async (
  args: Route.ActionArgs,
  formData: FormData,
) => {
  const id = formData.get('id');
  if (typeof id !== 'string' || !id.trim()) {
    return { error: 'Missing checkout id.' };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      RefreshCheckoutDocument,
      { input: { id: id.trim() } },
    );
    return {
      refreshed: {
        checkoutId: data.refreshCheckout.checkout.id,
        drift: data.refreshCheckout.drift,
        merged: data.refreshCheckout.merged,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to refresh checkout.';
    return { error: message };
  }
};

export const deleteRepo = async (
  args: Route.ActionArgs,
  formData: FormData,
) => {
  const id = formData.get('id');
  if (typeof id !== 'string' || !id.trim()) {
    return { error: 'Missing repository id.' };
  }

  try {
    await executeGraphqlWithAuth(
      args.request,
      DeleteWorkspaceLocalRepositoryDocument,
      { id: id.trim() },
    );
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to remove repository.';
    return { error: message };
  }
};

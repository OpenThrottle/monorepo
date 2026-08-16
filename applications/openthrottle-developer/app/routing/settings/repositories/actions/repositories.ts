import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';
import {
  AddWorkspaceFolderInputSchema,
  CloneRepositoryInputSchema,
} from '~/__generated__/schemas';
import {
  AddWorkspaceFolderDocument,
  BrowseWorkspaceDirectoryDocument,
  CloneRepositoryDocument,
  DeleteWorkspaceLocalRepositoryDocument,
  PickFolderNativeDocument,
  RefreshCheckoutDocument,
} from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/settings.repositories._index';

export const addFolder = async (args: Route.ActionArgs, formData: FormData) => {
  const parsed = parseFormData(formData, AddWorkspaceFolderInputSchema(), {
    labels: { path: 'Folder path' },
    strict: false,
  });
  if (!parsed.success) {
    return { error: parsed.error };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      AddWorkspaceFolderDocument,
      {
        input: {
          displayName: parsed.data.displayName ?? null,
          path: parsed.data.path,
        },
      },
    );
    return { addedFolder: data.addWorkspaceFolder };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to add folder.';
    return { error: message };
  }
};

export const cloneRepo = async (args: Route.ActionArgs, formData: FormData) => {
  const parsed = parseFormData(formData, CloneRepositoryInputSchema(), {
    labels: { gitUrl: 'Git repository URL' },
    strict: false,
  });
  if (!parsed.success) {
    return { error: parsed.error };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      CloneRepositoryDocument,
      {
        input: { gitUrl: parsed.data.gitUrl, name: parsed.data.name ?? null },
      },
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
  const parsed = parseFormData(
    formData,
    z.object({ path: z.string().nullish() }),
    { strict: false },
  );
  const path = parsed.success ? (parsed.data.path ?? null) : null;

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
  const parsed = parseFormData(formData, z.object({ id: z.string().min(1) }), {
    labels: { id: 'Checkout id' },
    strict: false,
  });
  if (!parsed.success) {
    return { error: parsed.error };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      RefreshCheckoutDocument,
      { input: { id: parsed.data.id } },
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
  const parsed = parseFormData(formData, z.object({ id: z.string().min(1) }), {
    labels: { id: 'Repository id' },
    strict: false,
  });
  if (!parsed.success) {
    return { error: parsed.error };
  }

  try {
    await executeGraphqlWithAuth(
      args.request,
      DeleteWorkspaceLocalRepositoryDocument,
      { id: parsed.data.id },
    );
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to remove repository.';
    return { error: message };
  }
};

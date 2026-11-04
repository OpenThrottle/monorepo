import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';

import type { Route } from '@/app/routes/+types/settings.repositories._index';
import {
  AddWorkspaceFolderDocument,
  BrowseWorkspaceDirectoryDocument,
  CloneRepositoryDocument,
  DeleteWorkspaceLocalRepositoryDocument,
  PickFolderNativeDocument,
  PruneWorktreeCheckoutsDocument,
  RefreshCheckoutDocument,
} from '~/__generated__/graphql';
import {
  AddWorkspaceFolderInputSchema,
  CloneRepositoryInputSchema,
} from '~/__generated__/schemas';

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

/**
 * @description Prunes stale worktree checkout rows. Ids arrive comma-joined in one
 * `checkoutIds` field so the bulk button and the per-row action post the same shape; the
 * server re-checks every id and reports a per-id outcome rather than failing the batch.
 */
export const pruneWorktreeCheckouts = async (
  args: Route.ActionArgs,
  formData: FormData,
) => {
  const parsed = parseFormData(
    formData,
    z.object({ checkoutIds: z.string().min(1) }),
    { labels: { checkoutIds: 'Worktree records' }, strict: false },
  );
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const checkoutIds = parsed.data.checkoutIds
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== '');

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      PruneWorktreeCheckoutsDocument,
      { input: { checkoutIds } },
    );
    return { pruned: data.pruneWorktreeCheckouts.results };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to remove worktree records.';
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

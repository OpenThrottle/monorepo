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
  RemovePlanRunWorktreeDocument,
  RescanSettingsWorktreesDocument,
} from '~/__generated__/graphql';
import {
  AddWorkspaceFolderInputSchema,
  CloneRepositoryInputSchema,
} from '~/__generated__/schemas';
import { RESCAN_WORKTREES_INTENT } from '~/routing/settings/repositories/config/repositories.defaults';
import { errorMessageOr } from '~/routing/settings/repositories/utils/error-message';
import {
  PRUNE_WORKTREE_CHECKOUTS_INTENT,
  REMOVE_PLAN_RUN_WORKTREE_INTENT,
} from '~/routing/settings/repositories/utils/missing-rows';

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
    return {
      error: errorMessageOr(error, 'Failed to open the folder dialog.'),
    };
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
    return {
      error: errorMessageOr(error, 'Failed to remove worktree records.'),
    };
  }
};

/**
 * @description Removes one plan-run worktree from disk. The server re-runs every teardown guard,
 * so a worktree that became dirty since the page loaded comes back as kept, with the reason.
 */
export const removePlanRunWorktree = async (
  args: Route.ActionArgs,
  formData: FormData,
) => {
  const parsed = parseFormData(
    formData,
    z.object({ checkoutId: z.string().min(1) }),
    { labels: { checkoutId: 'Worktree' }, strict: false },
  );
  if (!parsed.success) {
    return { error: parsed.error };
  }

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      RemovePlanRunWorktreeDocument,
      { checkoutId: parsed.data.checkoutId },
    );
    return { removal: data.removePlanRunWorktree };
  } catch (error) {
    return { error: errorMessageOr(error, 'Failed to remove the worktree.') };
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

/**
 * @description Forces a fresh on-disk worktree scan. The server caches each user's scan for a few
 * seconds, so a plain loader revalidation would hand back the cached one; this asks for
 * `refresh: true`, which replaces the cache, and the revalidation that follows every action then
 * reads the fresh scan.
 */
export const rescanWorktrees = async (args: Route.ActionArgs) => {
  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      RescanSettingsWorktreesDocument,
    );
    return { rescannedAt: data.discoveredWorktrees.scannedAt };
  } catch (error) {
    return { error: errorMessageOr(error, 'Failed to rescan worktrees.') };
  }
};

/**
 * @description The repositories route action: dispatches on the form's `intent`. Lives beside the
 * handlers it routes to, so adding an intent touches one module.
 */
export const repositoriesAction = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case 'addFolder':
      return addFolder(args, formData);
    case 'browseDirectory':
      return browseDirectory(args, formData);
    case 'cloneRepo':
      return cloneRepo(args, formData);
    case 'deleteRepo':
      return deleteRepo(args, formData);
    case 'pickFolderNative':
      return pickFolderNative(args);
    case PRUNE_WORKTREE_CHECKOUTS_INTENT:
      return pruneWorktreeCheckouts(args, formData);
    case 'refreshCheckout':
      return refreshCheckout(args, formData);
    case REMOVE_PLAN_RUN_WORKTREE_INTENT:
      return removePlanRunWorktree(args, formData);
    case RESCAN_WORKTREES_INTENT:
      return rescanWorktrees(args);

    default:
      throw new Error('Invalid intent');
  }
};

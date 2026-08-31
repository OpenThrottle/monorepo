/**
 * @description Flattens the plan loader's deferred `workspaceRepositories`
 * (repository + nested `checkouts[]`) into the flat `ChatCheckoutOption[]` the
 * chat `ChatCheckoutSelector` renders.
 *
 * 🚨 Deliberately NOT `toCheckoutOptions` from `@openthrottle/react-router-chat-state`:
 * that mapper takes `RepositoryOption` rows from `workspaceLocalRepositories`,
 * whose `id` is a *repository* id. Plan runs resolve `checkoutId` ahead of
 * `repositoryId`, so the option id here must be the CHECKOUT id — two different
 * id spaces that would silently mis-associate a plan if shared.
 */
import type { ChatCheckoutOption } from '@openthrottle/react-router-chat';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import { basename } from '~/routing/plans/utils/plan-workflow-config-workspace-selector';

const firstNonEmpty = (
  ...values: readonly (string | null | undefined)[]
): string | undefined =>
  values.find((value) => (value ?? '').trim() !== '')?.trim();

/**
 * @description One option per registered checkout, carrying the identity fields
 * the picker groups, searches and disambiguates on — the same set chat gets.
 * A repository with no checkouts contributes nothing: there is no path to run in.
 *
 * `projectName` is not requested by `PlanRunConfigRepositoryFields` (the fragment
 * carries `projectId` only), so options never set it; the selector falls back to
 * the remote's `owner/name`, then the filesystem path, to disambiguate.
 */
export const toPlanCheckoutOptions = (
  repositories: readonly PlanRunConfigRepositoryFieldsFragment[],
): ChatCheckoutOption[] =>
  repositories.flatMap((repository) =>
    repository.checkouts.map((checkout) => ({
      branch: firstNonEmpty(
        checkout.inspection?.git?.currentBranch,
        repository.defaultBranch,
        checkout.inspection?.git?.defaultBranch,
      ),
      filesystemPath: checkout.filesystemPath,
      id: checkout.id,
      // An empty display name would render a blank row, so fall back to the
      // folder name the same way the full workspace selector does.
      label:
        firstNonEmpty(checkout.displayName) ??
        basename(checkout.filesystemPath),
      remoteUrl: firstNonEmpty(repository.normalizedRemoteUrl),
    })),
  );

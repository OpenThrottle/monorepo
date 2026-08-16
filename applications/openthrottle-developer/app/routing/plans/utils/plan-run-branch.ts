/**
 * @description Resolves the git branch a plan run should default to, from the
 * workspace currently selected in the run config. The branch is a REQUIRED
 * enqueue input, so it must never resolve to an empty string — the fallback
 * chain always terminates at {@link FALLBACK_RUN_BRANCH}. Pure + hoisted so the
 * route-scoped store can seed it without mounting the Configuration tab.
 */
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';

/** @description Last-resort branch when nothing smarter is known. */
export const FALLBACK_RUN_BRANCH = 'main';

export interface ResolveDefaultRunBranchOptions {
  readonly checkoutId: string;
  readonly repositories: readonly PlanRunConfigRepositoryFieldsFragment[];
  readonly repositoryId: string;
}

const firstNonEmpty = (
  ...values: readonly (string | null | undefined)[]
): string | undefined =>
  values.find((value) => (value ?? '').trim() !== '')?.trim();

/**
 * @description Precedence: the selected checkout's current branch → its
 * repository's registered default branch → the branch git reports as the
 * repository default → the selected repository's registered default branch →
 * `main`.
 */
export const resolveDefaultRunBranch = (
  options: ResolveDefaultRunBranchOptions,
): string => {
  const { checkoutId, repositories, repositoryId } = options;

  if (checkoutId !== '') {
    for (const repository of repositories) {
      const checkout = repository.checkouts.find(
        (candidate) => candidate.id === checkoutId,
      );

      if (checkout) {
        return (
          firstNonEmpty(
            checkout.inspection?.git?.currentBranch,
            repository.defaultBranch,
            checkout.inspection?.git?.defaultBranch,
          ) ?? FALLBACK_RUN_BRANCH
        );
      }
    }
  }

  if (repositoryId !== '') {
    const repository = repositories.find(
      (candidate) => candidate.id === repositoryId,
    );

    if (repository) {
      const onlyCheckout =
        repository.checkouts.length === 1 ? repository.checkouts[0] : undefined;

      return (
        firstNonEmpty(
          repository.defaultBranch,
          onlyCheckout?.inspection?.git?.currentBranch,
          onlyCheckout?.inspection?.git?.defaultBranch,
        ) ?? FALLBACK_RUN_BRANCH
      );
    }
  }

  return FALLBACK_RUN_BRANCH;
};

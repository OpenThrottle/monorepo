/**
 * @description Resolves the absolute directory a plan's editor deep links should
 * open. Prefers the run-config working directory the user picked; falls back to
 * the selected checkout's on-disk path so the buttons still work before the
 * working-directory field has been touched.
 */

export interface PlanWorkingDirectoryCheckout {
  readonly filesystemPath: string;
  readonly id: string;
}

export interface PlanWorkingDirectoryRepository {
  readonly checkouts: readonly PlanWorkingDirectoryCheckout[];
  readonly id: string;
}

export interface ResolvePlanWorkingDirectoryInput {
  /** Selected checkout id from the run config, or empty when none is chosen. */
  readonly checkoutId: string;
  readonly repositories: readonly PlanWorkingDirectoryRepository[];
  /** Selected repository id from the run config, or empty when none is chosen. */
  readonly repositoryId: string;
  /** Run-config working directory; wins whenever it is set. */
  readonly workingDirectory: string;
}

/**
 * @description Returns the absolute path to open, or an empty string when
 * nothing resolves — callers render no link rather than a dead one.
 *
 * The fallback requires an explicitly selected checkout. Guessing (say, the
 * first registered checkout) would open a real folder that is the wrong one,
 * which is worse than no button: the link would look like it worked.
 */
export const resolvePlanWorkingDirectory = (
  input: ResolvePlanWorkingDirectoryInput,
): string => {
  const { checkoutId, repositories, repositoryId, workingDirectory } = input;

  if (workingDirectory !== '') {
    return workingDirectory;
  }

  if (checkoutId === '') {
    return '';
  }

  const selected = repositories
    .filter(
      (repository) => repositoryId === '' || repository.id === repositoryId,
    )
    .flatMap((repository) => repository.checkouts)
    .find((checkout) => checkout.id === checkoutId);

  return selected?.filesystemPath ?? '';
};

/**
 * @description The " · <branch>" suffix shown after a checkout's name in the
 * workspace picker; empty when the checkout has no current branch.
 */
export const getCheckoutBranchSuffix = (
  currentBranch: string | null | undefined,
): string => {
  if (!currentBranch) {
    return '';
  }

  return ` · ${currentBranch}`;
};

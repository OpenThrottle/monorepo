import { fillTemplate } from '@openthrottle/nodejs-utils';

import type { ChatCheckoutOption } from '../types';

/**
 * @description Where a displayed branch name came from. As-const object (no enum, repo rule).
 *
 * @public
 */
export const CHECKOUT_BRANCH_SOURCE = {
  current: 'current',
  default: 'default',
} as const;

export type CheckoutBranchSourceKey = keyof typeof CHECKOUT_BRANCH_SOURCE;
/**
 * @description Union of {@link CHECKOUT_BRANCH_SOURCE} values.
 *
 * @public
 */
export type CheckoutBranchSourceValue =
  (typeof CHECKOUT_BRANCH_SOURCE)[CheckoutBranchSourceKey];

/**
 * @description A branch name to show for a checkout, with whether it is really current.
 */
export interface CheckoutBranchDisplay {
  readonly name: string;
  readonly source: CheckoutBranchSourceValue;
}

const isNonEmpty = (value: string | undefined): value is string => {
  return value != null && value !== '';
};

/**
 * @description The branch to show for a checkout: its current branch when known, else the
 * repository default marked as `default` so the surface can label it. `undefined` when neither
 * is known.
 *
 * @public
 */
export const resolveCheckoutBranch = (
  checkout: Pick<ChatCheckoutOption, 'branch' | 'defaultBranch'> | undefined,
): CheckoutBranchDisplay | undefined => {
  if (checkout == null) {
    return undefined;
  }
  if (isNonEmpty(checkout.branch)) {
    return { name: checkout.branch, source: CHECKOUT_BRANCH_SOURCE.current };
  }
  if (isNonEmpty(checkout.defaultBranch)) {
    return {
      name: checkout.defaultBranch,
      source: CHECKOUT_BRANCH_SOURCE.default,
    };
  }

  return undefined;
};

/**
 * @description How a resolved branch is shown: its name, whether it is only the repo default, and the tooltip.
 */
export interface CheckoutBranchDescription {
  readonly isDefault: boolean;
  readonly name: string;
  readonly title: string;
}

/**
 * @description Name, default-ness and tooltip for a resolved checkout branch. The tooltip marks a
 * repository-default branch with `branchDefaultTemplate` (a `{branch}` template); an unresolved
 * branch yields empty strings.
 *
 * @public
 */
export const describeCheckoutBranch = (
  branch: CheckoutBranchDisplay | undefined,
  branchDefaultTemplate: string,
): CheckoutBranchDescription => {
  const name = branch?.name ?? '';
  const isDefault = branch?.source === CHECKOUT_BRANCH_SOURCE.default;
  const title = isDefault
    ? fillTemplate(branchDefaultTemplate, { branch: name })
    : name;

  return { isDefault, name, title };
};

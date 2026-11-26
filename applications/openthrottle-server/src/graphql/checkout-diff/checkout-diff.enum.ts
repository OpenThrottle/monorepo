/**
 * @description GraphQL enum for how a file differs from the checkout's base branch.
 */

import { registerEnumType } from '@nestjs/graphql';

export const CHECKOUT_DIFF_FILE_STATUS = {
  ADDED: 'added',
  DELETED: 'deleted',
  MODIFIED: 'modified',
  RENAMED: 'renamed',
} as const;

export type CheckoutDiffFileStatusKey = keyof typeof CHECKOUT_DIFF_FILE_STATUS;
export type CheckoutDiffFileStatusValue =
  (typeof CHECKOUT_DIFF_FILE_STATUS)[CheckoutDiffFileStatusKey];

registerEnumType(CHECKOUT_DIFF_FILE_STATUS, {
  description: `How a file differs from the checkout's base branch.`,
  name: 'CheckoutDiffFileStatus',
  valuesMap: {
    ADDED: { description: `New file, committed or untracked.` },
    DELETED: { description: `File removed.` },
    MODIFIED: { description: `Content or mode changed.` },
    RENAMED: { description: `Moved, possibly with edits; see previousPath.` },
  },
});

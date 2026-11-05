import { PLAN_CHECKOUT_SELECTOR_COPY } from '~/routing/plans/data/data.copy';

export interface PlanCheckoutHintInput {
  readonly minimal: boolean;
  readonly minimalHint: string | undefined;
  readonly optionCount: number;
  readonly selectionMissing: boolean;
}

/**
 * @description Tooltip hint for the plan checkout selector. The two failure
 * hints (empty registry, stale selection) outrank the minimal-mode hint; a
 * healthy full-size selector has no hint at all.
 */
export const getPlanCheckoutHint = (
  input: PlanCheckoutHintInput,
): string | undefined => {
  const { minimal, minimalHint, optionCount, selectionMissing } = input;

  if (optionCount === 0) {
    return PLAN_CHECKOUT_SELECTOR_COPY.emptyRegistryHint;
  }

  if (selectionMissing) {
    return PLAN_CHECKOUT_SELECTOR_COPY.staleCheckoutHint;
  }

  if (minimal) {
    return minimalHint ?? PLAN_CHECKOUT_SELECTOR_COPY.minimalHint;
  }

  return undefined;
};

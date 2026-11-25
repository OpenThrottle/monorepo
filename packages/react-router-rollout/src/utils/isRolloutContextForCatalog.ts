import type { RolloutContextValue } from '../data';
import type { RolloutFlagCatalog } from '../types';

/**
 * @description Narrows an untyped rollout context to the catalog a hook was
 * given. Identity is the evidence: the provider builds `values` from the very
 * `flags` object it exposes as `catalog`, so `context.catalog === flags` proves
 * the context's values were resolved against `TCatalog`.
 */
export const isRolloutContextForCatalog = <TCatalog extends RolloutFlagCatalog>(
  context: RolloutContextValue,
  flags: TCatalog,
): context is RolloutContextValue<TCatalog> => {
  return context.catalog === flags;
};

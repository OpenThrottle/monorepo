import type { RolloutContextValue } from '../data';
import type { RolloutFlagCatalog } from '../types';
import { useRequiredRolloutContext } from './useRequiredRolloutContext';

/**
 * Returns the rollout context for `flags`. Throws when used outside a
 * {@link RolloutProvider}, or when `flags` is not the provider's catalog.
 *
 * @public
 */
export const useRolloutContext = <TCatalog extends RolloutFlagCatalog>(
  flags: TCatalog,
): RolloutContextValue<TCatalog> => {
  // Hooks
  const ctx = useRequiredRolloutContext('useRolloutContext', flags);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return ctx;
};

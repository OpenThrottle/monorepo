import type { RolloutContextValue } from '../data';
import type { RolloutFlagCatalog } from '../types';
import { useRequiredRolloutContext } from './useRequiredRolloutContext';

export interface UseRolloutContextOptions {}

/**
 * Returns the rollout context. Throws when used outside a {@link RolloutProvider}.
 *
 * @public
 */
export const useRolloutContext = <
  TCatalog extends RolloutFlagCatalog = RolloutFlagCatalog,
>(
  _options?: UseRolloutContextOptions,
): RolloutContextValue<TCatalog> => {
  // const {} = _options;

  // Hooks
  const ctx = useRequiredRolloutContext<TCatalog>('useRolloutContext');

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return ctx;
};

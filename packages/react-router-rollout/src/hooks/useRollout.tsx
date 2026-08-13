import type { RolloutFlagCatalog, RolloutHydrationState } from '../types';
import type { RolloutResolvedValues } from '../utils';
import { useRequiredRolloutContext } from './useRolloutContext';

/**
 * Full resolved flag map plus hydration status / application key (debugging).
 *
 * Prefer {@link useRolloutFlag} / {@link useIsRolloutEnabled} in nested UI.
 *
 * @example
 * ```ts
 * const { applicationKey, hydration, values } = useRollout<typeof flags>();
 * ```
 *
 * @public
 */
export type UseRolloutResult<TCatalog extends RolloutFlagCatalog> = {
  readonly applicationKey: string;
  readonly hydration: RolloutHydrationState;
  readonly values: RolloutResolvedValues<TCatalog>;
};

/**
 * @public
 */
export const useRollout = <
  TCatalog extends RolloutFlagCatalog = RolloutFlagCatalog,
>(): UseRolloutResult<TCatalog> => {
  // Hooks
  const { applicationKey, hydration, values } =
    useRequiredRolloutContext<TCatalog>('useRollout');

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { applicationKey, hydration, values };
};

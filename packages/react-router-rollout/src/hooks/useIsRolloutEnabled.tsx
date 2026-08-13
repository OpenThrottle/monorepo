import type { RolloutBooleanFlagKey, RolloutFlagCatalog } from '../types';
import { useRequiredRolloutContext } from './useRolloutContext';

/**
 * Returns whether a **boolean** catalog flag is enabled.
 *
 * Non-boolean keys are rejected at the type level when the catalog is supplied:
 *
 * @example
 * ```ts
 * const enabled = useIsRolloutEnabled<typeof flags>('billing.invoices');
 * // useIsRolloutEnabled<typeof flags>('theme.mode') // type error
 * ```
 *
 * @public
 */
export const useIsRolloutEnabled = <TCatalog extends RolloutFlagCatalog>(
  key: RolloutBooleanFlagKey<TCatalog>,
): boolean => {
  // Hooks
  const { values } = useRequiredRolloutContext<TCatalog>('useIsRolloutEnabled');

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- RolloutBooleanFlagKey limits K; generic indexed access widens to the catalog value union
  return values[key] as boolean;
};

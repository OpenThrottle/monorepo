import type { RolloutBooleanFlagKey, RolloutFlagCatalog } from '../types';
import { useRequiredRolloutContext } from './useRequiredRolloutContext';

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
  const { catalog, values } = useRequiredRolloutContext<TCatalog>(
    'useIsRolloutEnabled',
  );

  // Setup
  const value = values[key];
  const isEnabled =
    typeof value === 'boolean' ? value : catalog[key]?.defaultValue === true;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return isEnabled;
};

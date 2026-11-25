import type { RolloutBooleanFlagKey, RolloutFlagCatalog } from '../types';
import { useRequiredRolloutContext } from './useRequiredRolloutContext';

/**
 * Returns whether a **boolean** catalog flag is enabled.
 *
 * Non-boolean keys are rejected at the type level:
 *
 * @example
 * ```ts
 * const enabled = useIsRolloutEnabled(flags, 'billing.invoices');
 * // useIsRolloutEnabled(flags, 'theme.mode') // type error
 * ```
 *
 * @public
 */
export const useIsRolloutEnabled = <TCatalog extends RolloutFlagCatalog>(
  flags: TCatalog,
  key: RolloutBooleanFlagKey<TCatalog>,
): boolean => {
  // Hooks
  const { catalog, values } = useRequiredRolloutContext(
    'useIsRolloutEnabled',
    flags,
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

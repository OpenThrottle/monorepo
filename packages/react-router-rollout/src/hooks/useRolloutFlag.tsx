import type {
  RolloutFlagCatalog,
  RolloutFlagKey,
  RolloutFlagValue,
} from '../catalog';
import { useRequiredRolloutContext } from './useRolloutContext';

/**
 * Returns the resolved value for a catalog flag key under {@link RolloutProvider}.
 *
 * Pass the catalog as a type argument so the key and return type stay in sync:
 *
 * @example
 * ```ts
 * const enabled = useRolloutFlag<typeof flags>('billing.invoices'); // boolean
 * const theme = useRolloutFlag<typeof flags>('theme.mode'); // string
 * ```
 *
 * @public
 */
export const useRolloutFlag = <
  TCatalog extends RolloutFlagCatalog,
  K extends RolloutFlagKey<TCatalog>,
>(
  key: K,
): RolloutFlagValue<TCatalog, K> => {
  // Hooks
  const { values } = useRequiredRolloutContext<TCatalog>('useRolloutFlag');

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return values[key];
};

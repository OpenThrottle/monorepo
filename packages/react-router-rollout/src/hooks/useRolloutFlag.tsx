import type {
  RolloutFlagCatalog,
  RolloutFlagKey,
  RolloutFlagValue,
} from '../types';
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
  TKey extends RolloutFlagKey<TCatalog>,
>(
  key: TKey,
): RolloutFlagValue<TCatalog, TKey> => {
  // Hooks
  const { values } = useRequiredRolloutContext<TCatalog>('useRolloutFlag');

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return values[key];
};

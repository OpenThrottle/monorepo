import type {
  RolloutFlagCatalog,
  RolloutFlagKey,
  RolloutFlagValue,
} from '../types';
import { useRequiredRolloutContext } from './useRequiredRolloutContext';

/**
 * Returns the resolved value for a catalog flag key under {@link RolloutProvider}.
 *
 * Pass the same catalog object the provider was given; the key and return type
 * are inferred from it:
 *
 * @example
 * ```ts
 * const enabled = useRolloutFlag(flags, 'billing.invoices'); // boolean
 * const theme = useRolloutFlag(flags, 'theme.mode'); // string
 * ```
 *
 * @public
 */
export const useRolloutFlag = <
  TCatalog extends RolloutFlagCatalog,
  TKey extends RolloutFlagKey<TCatalog>,
>(
  flags: TCatalog,
  key: TKey,
): RolloutFlagValue<TCatalog, TKey> => {
  // Hooks
  const { values } = useRequiredRolloutContext('useRolloutFlag', flags);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return values[key];
};

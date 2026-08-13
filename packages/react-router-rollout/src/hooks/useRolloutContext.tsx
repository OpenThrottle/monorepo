import { useContext } from 'react';

import type { RolloutFlagCatalog } from '../types';
import { RolloutContext, type RolloutContextValue } from '../data';

export interface UseRolloutContextOptions {}

/**
 * Reads rollout context or throws an actionable invariant for the given hook.
 * Internal shared helper — prefer the public hooks.
 */
export const useRequiredRolloutContext = <
  TCatalog extends RolloutFlagCatalog = RolloutFlagCatalog,
>(
  hookName: string,
): RolloutContextValue<TCatalog> => {
  const ctx = useContext(RolloutContext);

  if (!ctx) {
    const message = `🚨 ${hookName} must be used within a RolloutProvider`;

    throw new Error(message);
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- consumer supplies catalog type parameter
  return ctx as RolloutContextValue<TCatalog>;
};

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

  return useRequiredRolloutContext<TCatalog>('useRolloutContext');
};

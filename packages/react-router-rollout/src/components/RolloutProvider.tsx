import * as React from 'react';

import type { RolloutFlagCatalog } from '../types';
import { RolloutContext } from '../data';
import {
  useRolloutProvider,
  type UseRolloutProviderOptions,
} from '../hooks/useRolloutProvider';

export interface RolloutProviderProps<
  TCatalog extends RolloutFlagCatalog = RolloutFlagCatalog,
> extends UseRolloutProviderOptions<TCatalog> {
  readonly children: React.ReactNode;
}

/**
 * Root provider that hydrates typed rollout evaluations for nested hooks.
 *
 * @public
 */
export const RolloutProvider = <TCatalog extends RolloutFlagCatalog>(
  props: RolloutProviderProps<TCatalog>,
): React.ReactElement => {
  const { children, ...providerOptions } = props;

  // Hooks
  const value = useRolloutProvider(providerOptions);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <RolloutContext.Provider value={value}>{children}</RolloutContext.Provider>
  );
};

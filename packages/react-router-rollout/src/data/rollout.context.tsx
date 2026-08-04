import * as React from 'react';

import type { RolloutFlagCatalog } from '../catalog';
import type { RolloutHydrationState } from '../types';
import type { RolloutResolvedValues } from '../utils';

/**
 * Context value exposed under {@link RolloutProvider}.
 *
 * @public
 */
export type RolloutContextValue<
  TCatalog extends RolloutFlagCatalog = RolloutFlagCatalog,
> = {
  readonly applicationKey: string;
  readonly catalog: TCatalog;
  readonly hydration: RolloutHydrationState;
  readonly refresh: () => Promise<void>;
  readonly values: RolloutResolvedValues<TCatalog>;
};

/**
 * React context for rollout hydration. Prefer {@link useRolloutContext}.
 *
 * @public
 */
export const RolloutContext =
  React.createContext<RolloutContextValue<RolloutFlagCatalog> | null>(null);

import * as React from 'react';

import { RolloutContext, type RolloutContextValue } from '../data';
import type { RolloutFlagCatalog } from '../types';

/**
 * Reads rollout context or throws an actionable invariant naming the calling
 * hook. Internal shared helper — not exported from the package; prefer the
 * public hooks.
 */
export const useRequiredRolloutContext = <
  TCatalog extends RolloutFlagCatalog = RolloutFlagCatalog,
>(
  hookName: string,
): RolloutContextValue<TCatalog> => {
  // Hooks
  const ctx = React.useContext(RolloutContext);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!ctx) {
    const message = `🚨 ${hookName} must be used within a RolloutProvider`;

    throw new Error(message);
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- consumer supplies catalog type parameter
  return ctx as RolloutContextValue<TCatalog>;
};

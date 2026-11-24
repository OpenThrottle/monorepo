import * as React from 'react';

import type { RolloutContextValue } from '../data';
import { RolloutContext } from '../data';
import type { RolloutFlagCatalog } from '../types';
import { isRolloutContextForCatalog } from '../utils';

/**
 * Reads rollout context for `flags`, or throws an actionable invariant naming
 * the calling hook: outside a provider, or under a provider built from a
 * different catalog object. Internal shared helper — not exported from the
 * package; prefer the public hooks.
 */
export const useRequiredRolloutContext = <TCatalog extends RolloutFlagCatalog>(
  hookName: string,
  flags: TCatalog,
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

  if (!isRolloutContextForCatalog(ctx, flags)) {
    const message = `🚨 ${hookName} was given a different flag catalog than its RolloutProvider's \`flags\``;

    throw new Error(message);
  }

  return ctx;
};

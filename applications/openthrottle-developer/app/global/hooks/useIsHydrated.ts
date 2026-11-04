import * as React from 'react';

import { subscribeToNothing } from '~/global/utils/external-stores';

/**
 * @description `false` on the server and during the hydrating render, `true` on
 * every client render after that. Gate anything that depends on the viewer's
 * environment (their time zone, locale) on it, so the first client render
 * matches the server HTML and React never warns about a hydration mismatch.
 */
export const useIsHydrated = (): boolean => {
  // Hooks
  const hydrated = React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return hydrated;
};

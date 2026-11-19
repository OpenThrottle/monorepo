import * as React from 'react';

/**
 * @description `false` while rendering on the server and during the client's
 * hydration pass, `true` on every render after that — including the first
 * render of a component mounted by a client-side navigation, which has no
 * server markup to match. Gate any client-only value (a random id, `window`,
 * `matchMedia`, persisted preferences) on it so the hydration render reproduces
 * the server markup exactly and the client value lands on the next commit.
 * @public
 */
export const useIsHydrated = (): boolean => {
  // Hooks
  // Nothing to subscribe to: the snapshot only differs between the server
  // (and hydration) render and later client renders, never over time.
  const subscribe = React.useCallback(() => {
    return () => {};
  }, []);
  const isHydrated = React.useSyncExternalStore(
    subscribe,
    () => {
      return true;
    },
    () => {
      return false;
    },
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return isHydrated;
};

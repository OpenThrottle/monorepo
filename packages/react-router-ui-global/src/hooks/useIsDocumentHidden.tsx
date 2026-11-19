import * as React from 'react';

/**
 * @description `true` while `document.visibilityState` is `'hidden'` (a
 * background tab, a minimised window), re-rendering on `visibilitychange`.
 * Always `false` on the server and during hydration.
 */
export const useIsDocumentHidden = (): boolean => {
  // Hooks
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    document.addEventListener('visibilitychange', onStoreChange);

    return () => {
      document.removeEventListener('visibilitychange', onStoreChange);
    };
  }, []);
  const isDocumentHidden = React.useSyncExternalStore(
    subscribe,
    () => {
      return document.visibilityState === 'hidden';
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

  return isDocumentHidden;
};

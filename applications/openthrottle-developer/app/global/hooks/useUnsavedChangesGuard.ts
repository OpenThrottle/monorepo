import * as React from 'react';
import type { Blocker } from 'react-router';
import { useBlocker } from 'react-router';

/**
 * @description Guards unsaved edits. While `isDirty`, an in-app navigation to a
 * different URL is blocked (render a confirm dialog from the returned
 * {@link Blocker}), and closing or reloading the tab asks the browser's own
 * "leave site?" prompt. Once the edits are saved, a pending block proceeds.
 */
export const useUnsavedChangesGuard = (isDirty: boolean): Blocker => {
  // Hooks
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  React.useEffect(() => {
    if (blocker.state === 'blocked' && !isDirty) {
      blocker.proceed();
    }
  }, [blocker, isDirty]);

  // 🔌 Short Circuit

  return blocker;
};

import * as React from 'react';

export interface UseHeaderHeightVariableOptions {
  /** The sticky header whose rendered height is published. */
  readonly headerRef: React.RefObject<HTMLElement | null>;
}

/**
 * @description Publishes the sticky header's rendered height as
 * `--global-header-height` on `<html>`, kept current with a `ResizeObserver`,
 * so other sticky surfaces (a right-hand drawer) can pin below the header
 * instead of sliding under it: `top-(--global-header-height)`. The variable is
 * removed on unmount, so a page without the header falls back to `0px`.
 */
export const useHeaderHeightVariable = (
  options: UseHeaderHeightVariableOptions,
): void => {
  const { headerRef } = options;

  // Hooks
  React.useEffect(() => {
    const header = headerRef.current;
    const root = document.documentElement;
    const variable = '--global-header-height';

    if (header === null || typeof ResizeObserver === 'undefined') {
      return;
    }

    const publish = (): void => {
      root.style.setProperty(variable, `${header.offsetHeight}px`);
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);

    return () => {
      observer.disconnect();
      root.style.removeProperty(variable);
    };
  }, [headerRef]);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
};

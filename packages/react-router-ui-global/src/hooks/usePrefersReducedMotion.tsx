import * as React from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * @description Returns true when the user has requested reduced motion via the
 * OS/browser `prefers-reduced-motion` setting. SSR-safe (defaults to false on
 * the server, resolves on mount).
 * @public
 */
export const usePrefersReducedMotion = (): boolean => {
  // Hooks
  const [prefersReducedMotion, setPrefersReducedMotion] =
    React.useState<boolean>(false);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (): void => {
      setPrefersReducedMotion(mql.matches);
    };

    mql.addEventListener('change', onChange);

    setPrefersReducedMotion(mql.matches);

    return () => mql.removeEventListener('change', onChange);
  }, []);

  // 🔌 Short Circuit

  return prefersReducedMotion;
};

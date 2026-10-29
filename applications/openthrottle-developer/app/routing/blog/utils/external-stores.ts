const PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * @description `useSyncExternalStore` subscriber for a store that never changes:
 * subscribes to nothing and returns a no-op unsubscribe.
 */
export const subscribeToNothing = (): (() => void) => () => undefined;

/**
 * @description `useSyncExternalStore` subscriber for the OS color-scheme
 * preference. Calls `onChange` whenever it flips; a no-op where `matchMedia`
 * is unavailable (the server, older test environments).
 */
export const subscribeToPrefersDark = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => undefined;
  }

  const query = window.matchMedia(PREFERS_DARK_QUERY);

  query.addEventListener('change', onChange);

  return () => query.removeEventListener('change', onChange);
};

/**
 * @description True when the OS prefers a dark color scheme; `false` where
 * `matchMedia` is unavailable.
 */
export const getPrefersDark = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(PREFERS_DARK_QUERY).matches;

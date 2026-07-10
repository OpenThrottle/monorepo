import { useEffect, useState } from 'react';
import {
  resolveThemeMode,
  type ResolvedThemeMode,
  type ThemeMode,
} from '../utils/theme';

const PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)';

/** Read the current OS dark preference; false on the server (no `matchMedia`). */
const prefersColorSchemeDark = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(PREFERS_DARK_QUERY).matches;

/**
 * @publicApi
 * @description Resolve a stored {@link ThemeMode} to a concrete `light`/`dark`
 * value on the client and apply it as the `.dark` class on
 * `document.documentElement` (which both the base theme and custom palettes
 * respond to), returning the resolved mode for the caller's `<html>` className.
 *
 * SSR-safe: the server resolves `system` with `prefersDark = false` (the OS
 * preference is unknown there), and the caller's pre-hydration script — see
 * {@link buildThemePrehydrationScript} — sets the class before first paint to
 * avoid a flash. While in `system` mode the hook subscribes to
 * `matchMedia('(prefers-color-scheme: dark)')` change events so an OS theme
 * switch updates the app live; the listener is removed when leaving `system`
 * mode or on unmount.
 *
 * Shared across OpenThrottle RR apps: call it in the root layout with the
 * persisted theme and use the return value for the SSR `<html>` class.
 */
export const useResolvedThemeMode = (theme: ThemeMode): ResolvedThemeMode => {
  // Lazily read the OS preference on the client so the very first client render
  // resolves `system` correctly (SSR has no OS knowledge → false).
  const [prefersDark, setPrefersDark] = useState<boolean>(
    prefersColorSchemeDark,
  );

  // Keep `prefersDark` in sync with the OS. The change listener is attached
  // only while in system mode — the one mode where the OS preference changes
  // the resolved theme — and removed when leaving system mode or on unmount.
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const query = window.matchMedia(PREFERS_DARK_QUERY);
    setPrefersDark(query.matches);
    if (theme !== 'system') {
      return;
    }
    const handleChange = (event: MediaQueryListEvent): void => {
      setPrefersDark(event.matches);
    };
    query.addEventListener('change', handleChange);
    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, [theme]);

  const resolved = resolveThemeMode(theme, prefersDark);

  // Apply the resolved mode as the `.dark` class on the document element.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  return resolved;
};

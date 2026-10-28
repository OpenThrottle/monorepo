import { useEffect, useState } from 'react';

import { PREFERS_DARK_QUERY } from '../config/color-scheme';
import { prefersColorSchemeDark } from '../utils/prefers-color-scheme-dark';
import {
  type ResolvedThemeMode,
  resolveThemeMode,
  type ThemeMode,
} from '../utils/theme';

/**
 * @public
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
  // Hooks
  // Lazily read the OS preference on the client so the very first client render
  // resolves `system` correctly (SSR has no OS knowledge → false).
  const [prefersDark, setPrefersDark] = useState<boolean>(
    prefersColorSchemeDark,
  );

  // Setup
  const resolved = resolveThemeMode(theme, prefersDark);

  // Handlers

  // Markup

  // Life Cycle
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

  // Apply the resolved mode as the `.dark` class on the document element.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  // 🔌 Short Circuit

  return resolved;
};

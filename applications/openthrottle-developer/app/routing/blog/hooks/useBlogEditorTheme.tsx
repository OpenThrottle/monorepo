import { resolveThemeMode } from '@openthrottle/react-router-utils';
import { useAtomValue } from 'jotai';
import * as React from 'react';

import { configAtom } from '~/global/data/atom.config';
import { BLOG_EDITOR_MONACO_THEMES } from '~/routing/blog/config/defaults';

const PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)';

const subscribe = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => undefined;
  }

  const query = window.matchMedia(PREFERS_DARK_QUERY);

  query.addEventListener('change', onChange);

  return () => query.removeEventListener('change', onChange);
};

const getPrefersDark = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(PREFERS_DARK_QUERY).matches;

/**
 * @description The Monaco theme matching the app's appearance setting
 * (`light`, `dark`, or `system`, which follows the OS and updates live).
 */
export const useBlogEditorTheme = (): string => {
  // Hooks
  const { theme } = useAtomValue(configAtom);
  const prefersDark = React.useSyncExternalStore(
    subscribe,
    getPrefersDark,
    () => false,
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return BLOG_EDITOR_MONACO_THEMES[resolveThemeMode(theme, prefersDark)];
};

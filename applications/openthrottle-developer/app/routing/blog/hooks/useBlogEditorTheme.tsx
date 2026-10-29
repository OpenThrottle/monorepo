import { resolveThemeMode } from '@openthrottle/react-router-utils';
import { useAtomValue } from 'jotai';
import * as React from 'react';

import { configAtom } from '~/global/data/atom.config';
import { BLOG_EDITOR_MONACO_THEMES } from '~/routing/blog/config/defaults';
import {
  getPrefersDark,
  subscribeToPrefersDark,
} from '~/routing/blog/utils/external-stores';

/**
 * @description The Monaco theme matching the app's appearance setting
 * (`light`, `dark`, or `system`, which follows the OS and updates live).
 */
export const useBlogEditorTheme = (): string => {
  // Hooks
  const { theme } = useAtomValue(configAtom);
  const prefersDark = React.useSyncExternalStore(
    subscribeToPrefersDark,
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

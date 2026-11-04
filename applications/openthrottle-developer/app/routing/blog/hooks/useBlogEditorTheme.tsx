import {
  prefersColorSchemeDark,
  resolveThemeMode,
} from '@openthrottle/react-router-utils';
import { useAtomValue } from 'jotai';
import * as React from 'react';

import { configAtom } from '~/global/data/atom.config';
import { subscribeToPrefersDark } from '~/global/utils/external-stores';
import { BLOG_EDITOR_MONACO_THEMES } from '~/routing/blog/config/defaults';

/**
 * @description The Monaco theme matching the app's appearance setting
 * (`light`, `dark`, or `system`, which follows the OS and updates live).
 */
export const useBlogEditorTheme = (): string => {
  // Hooks
  const { theme } = useAtomValue(configAtom);
  const prefersDark = React.useSyncExternalStore(
    subscribeToPrefersDark,
    prefersColorSchemeDark,
    () => false,
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return BLOG_EDITOR_MONACO_THEMES[resolveThemeMode(theme, prefersDark)];
};

import {
  prefersColorSchemeDark,
  resolveThemeMode,
} from '@openthrottle/react-router-utils';
import * as React from 'react';

import { useHydratedAppearanceConfig } from '~/global/hooks/useHydratedAppearanceConfig';
import { subscribeToPrefersDark } from '~/global/utils/subscribeToPrefersDark';
import { BLOG_EDITOR_MONACO_THEMES } from '~/routing/blog/config/defaults';

/**
 * @description The Monaco theme matching the app's appearance setting
 * (`light`, `dark`, or `system`, which follows the OS and updates live).
 * Reads the hydration-gated config, so the server render and the hydrating
 * render both resolve the default theme with no OS preference and any caller
 * may render the result before hydration without a mismatch.
 */
export const useBlogEditorTheme = (): string => {
  // Hooks
  const { config } = useHydratedAppearanceConfig();
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

  return BLOG_EDITOR_MONACO_THEMES[resolveThemeMode(config.theme, prefersDark)];
};

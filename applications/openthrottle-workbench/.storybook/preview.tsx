import * as React from 'react';
import {
  buildThemeStylesheet,
  OPENTHROTTLE_THEME,
  THEMES,
} from '@openthrottle/react-router-shadcn';
import type { Decorator, Preview } from '@storybook/react-vite';

import './preview.css';

const THEME_STYLESHEET_ID = 'openthrottle-theme-registry';

/**
 * The whole registry as `html[data-theme=…]` blocks, injected once. This is the
 * same call `applications/openthrottle-developer/app/root.tsx` makes — the
 * builder already knows how to turn a `Theme` into scoped token overrides, so
 * there is no CSS-variable injection to reimplement here.
 */
const ensureThemeStylesheet = (): void => {
  if (document.getElementById(THEME_STYLESHEET_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = THEME_STYLESHEET_ID;
  style.textContent = buildThemeStylesheet(THEMES);
  document.head.append(style);
};

interface ThemeRootProps {
  readonly children: React.ReactNode;
  readonly colorScheme: string;
  readonly themeId: string;
}

/**
 * Applies the selection to `<html>` exactly the way a consuming app does:
 * `data-theme` selects the palette, the `dark` class selects the variant within
 * it. Both live on the document element because that is the selector
 * `buildThemeStylesheet` emits against.
 */
const ThemeRoot = (props: ThemeRootProps): React.ReactElement => {
  const { children, colorScheme, themeId } = props;

  // Hooks
  React.useEffect(() => {
    ensureThemeStylesheet();

    const root = document.documentElement;
    root.dataset.theme = themeId;
    root.classList.toggle('dark', colorScheme === 'dark');
  }, [colorScheme, themeId]);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <>{children}</>;
};

const withThemeRegistry: Decorator = (Story, context) => (
  <ThemeRoot
    colorScheme={String(context.globals.colorScheme)}
    themeId={String(context.globals.theme)}
  >
    <Story />
  </ThemeRoot>
);

const preview: Preview = {
  decorators: [withThemeRegistry],
  /**
   * Read straight off the registry, so adding a theme to `registry.ts` surfaces
   * it in this toolbar with no change here. The light/dark axis is separate
   * because every `Theme` carries both variants — they are two independent
   * choices, not one list.
   */
  globalTypes: {
    colorScheme: {
      description: 'Light or dark variant of the selected palette',
      toolbar: {
        dynamicTitle: true,
        icon: 'contrast',
        items: [
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
        ],
      },
    },
    theme: {
      description: 'Palette from the shadcn theme registry',
      toolbar: {
        dynamicTitle: true,
        icon: 'paintbrush',
        items: THEMES.map((entry) => ({
          title: entry.label,
          value: entry.id,
        })),
      },
    },
  },
  initialGlobals: {
    colorScheme: 'light',
    theme: OPENTHROTTLE_THEME.id,
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  /**
   * Autodocs for every component: the package exports real prop interfaces, so
   * the API table is generated rather than written. A docs-first workbench
   * wants this on globally, not opted into story by story.
   */
  tags: ['autodocs'],
};

export default preview;

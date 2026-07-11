import { CURSOR_THEMES } from './cursor-themes';
import type { Theme } from './theme-contract';

/**
 * Reference theme — the OpenThrottle default palette, derived verbatim from the
 * base `:root` / dark values in `theme.css`. Serves as the porting template for
 * every other theme in the registry.
 */
export const OPENTHROTTLE_THEME: Theme = {
  dark: {
    accent: 'hsl(208 100% 50%)',
    'accent-foreground': 'hsl(210 17% 5%)',
    background: 'hsl(210 17% 5%)',
    border: 'hsl(210 17% 15%)',
    brand: 'hsl(208 100% 50%)',
    card: 'hsl(210 17% 9%)',
    'card-foreground': 'hsl(210 20% 98%)',
    'chart-1': 'hsl(208 100% 50%)',
    'chart-2': 'hsl(160 60% 45%)',
    'chart-3': 'hsl(30 80% 55%)',
    'chart-4': 'hsl(280 65% 60%)',
    'chart-5': 'hsl(340 75% 55%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    'destructive-foreground': 'hsl(0 0% 98%)',
    foreground: 'hsl(210 20% 98%)',
    input: 'hsl(210 17% 15%)',
    muted: 'hsl(210 17% 15%)',
    'muted-foreground': 'hsl(210 14% 55%)',
    'overlay-background': 'hsla(0, 0%, 0%, 0.6)',
    popover: 'hsl(210 17% 9%)',
    'popover-foreground': 'hsl(210 20% 98%)',
    primary: 'hsl(210 20% 98%)',
    'primary-foreground': 'hsl(210 17% 5%)',
    ring: 'hsl(208 100% 50%)',
    secondary: 'hsl(210 17% 15%)',
    'secondary-foreground': 'hsl(210 20% 98%)',
    'sidebar-accent': 'hsl(210 17% 15%)',
    'sidebar-accent-foreground': 'hsl(210 14% 90%)',
    'sidebar-background': 'hsl(210 17% 8%)',
    'sidebar-border': 'hsl(210 17% 15%)',
    'sidebar-foreground': 'hsl(210 14% 90%)',
    'sidebar-primary': 'hsl(208 100% 50%)',
    'sidebar-primary-foreground': 'hsl(210 17% 5%)',
    'sidebar-ring': 'hsl(208 100% 50%)',
  },
  id: 'openthrottle',
  label: 'OpenThrottle',
  light: {
    accent: 'hsl(208 100% 50%)',
    'accent-foreground': 'hsl(0 0% 100%)',
    background: 'hsl(0 0% 100%)',
    border: 'hsl(220 13% 91%)',
    brand: 'hsl(208 100% 50%)',
    card: 'hsl(0 0% 98%)',
    'card-foreground': 'hsl(0 0% 3.9%)',
    'chart-1': 'hsl(12 76% 61%)',
    'chart-2': 'hsl(173 58% 39%)',
    'chart-3': 'hsl(197 37% 24%)',
    'chart-4': 'hsl(43 74% 66%)',
    'chart-5': 'hsl(27 87% 67%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    'destructive-foreground': 'hsl(0 0% 98%)',
    foreground: 'hsl(0 0% 3.9%)',
    input: 'hsl(0 0% 80%)',
    muted: 'hsl(0 0% 96.1%)',
    'muted-foreground': 'hsl(0 0% 45.1%)',
    'overlay-background': 'hsla(0, 0%, 100%, 0.6)',
    popover: 'hsl(0 0% 100%)',
    'popover-foreground': 'hsl(0 0% 3.9%)',
    primary: 'hsl(0 0% 9%)',
    'primary-foreground': 'hsl(0 0% 98%)',
    ring: 'hsl(208 100% 50%)',
    secondary: 'hsl(0 0% 96.1%)',
    'secondary-foreground': 'hsl(0 0% 9%)',
    'sidebar-accent': 'hsl(240 4.8% 94%)',
    'sidebar-accent-foreground': 'hsl(240 5.9% 10%)',
    'sidebar-background': 'hsl(0 0% 98%)',
    'sidebar-border': 'hsl(220 13% 91%)',
    'sidebar-foreground': 'hsl(240 5.3% 26.1%)',
    'sidebar-primary': 'hsl(240 5.9% 10%)',
    'sidebar-primary-foreground': 'hsl(0 0% 98%)',
    'sidebar-ring': 'hsl(217.2 91.2% 59.8%)',
  },
};

/**
 * @public
 * @description The full theme registry: the OpenThrottle reference theme plus
 * the ported Cursor themes. Consumers build the stylesheet from this and list
 * it in a switcher.
 */
export const THEMES: readonly Theme[] = [OPENTHROTTLE_THEME, ...CURSOR_THEMES];

/** @public All registered theme ids, in display order. */
export const THEME_IDS: readonly string[] = THEMES.map((theme) => theme.id);

/** @public Looks up a theme by id. */
export const getTheme = (id: string): Theme | undefined =>
  THEMES.find((theme) => theme.id === id);

/** @public Type guard: whether `value` is a registered theme id. */
export const isThemeId = (value: unknown): value is string =>
  typeof value === 'string' && THEMES.some((theme) => theme.id === value);

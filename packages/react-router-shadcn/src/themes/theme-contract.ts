/**
 * The token contract a theme must satisfy: the minimal set of CSS custom
 * properties (from `src/theme.css`) that fully determine a palette. Structural
 * tokens defined once in theme.css (`--radius`, `--tw-ring-color`, the
 * `--sidebar` alias) are NOT part of the contract — themes only override the
 * semantic color tokens below.
 */
export const THEME_TOKEN_NAMES = [
  'brand',
  'overlay-background',
  'accent',
  'accent-foreground',
  'background',
  'border',
  'card',
  'card-foreground',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'destructive',
  'destructive-foreground',
  'foreground',
  'input',
  'muted',
  'muted-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'ring',
  'secondary',
  'secondary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-background',
  'sidebar-border',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-ring',
] as const;

/** A CSS custom-property name (without the leading `--`) a theme must define. */
export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];

/**
 * A complete set of token values (any valid CSS color string, e.g.
 * `hsl(0 0% 100%)`), one per {@link ThemeTokenName}.
 */
export type ThemeTokens = Readonly<Record<ThemeTokenName, string>>;

/**
 * @publicApi
 * A named theme: a light + dark pair, each a full {@link ThemeTokens} map. `id`
 * is the value written to `<html data-theme>`; `label` is the switcher display
 * name.
 */
export interface Theme {
  readonly dark: ThemeTokens;
  readonly id: string;
  readonly label: string;
  readonly light: ThemeTokens;
}

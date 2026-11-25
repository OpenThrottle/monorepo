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

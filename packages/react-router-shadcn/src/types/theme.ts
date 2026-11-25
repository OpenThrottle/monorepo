import type { THEME_TOKEN_NAMES } from '../data/theme-tokens';

/** A CSS custom-property name (without the leading `--`) a theme must define. */
export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];

/**
 * A complete set of token values (any valid CSS color string, e.g.
 * `hsl(0 0% 100%)`), one per {@link ThemeTokenName}.
 */
export type ThemeTokens = Readonly<Record<ThemeTokenName, string>>;

/**
 * @public
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

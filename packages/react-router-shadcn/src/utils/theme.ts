import {
  THEME_SAFELIST_BANNER,
  THEME_SAFELIST_HOVER_PREFIXES,
  THEME_SAFELIST_PREFIXES,
  THEME_TOKEN_COLOR_ALIASES,
} from '../data/theme-safelist';
import { THEME_TOKEN_NAMES } from '../data/theme-tokens';
import { THEMES } from '../data/themes';
import type { Theme, ThemeTokens } from '../types/theme';

const braces = (items: readonly string[]): string => {
  return `{${items.join(',')}}`;
};

/**
 * @public
 * @description The Tailwind color name for every theme token, alphabetized and
 * de-duplicated — the names `bg-*`, `text-*` and the other color utilities
 * accept.
 */
export const getThemeColorNames = (): readonly string[] => {
  const names = THEME_TOKEN_NAMES.map((token) => {
    return THEME_TOKEN_COLOR_ALIASES[token] ?? token;
  });

  return [...new Set(names)].sort();
};

/**
 * @public
 * @description The Tailwind v4 brace patterns `theme-safelist.css` forces — the base color
 * utilities and their `hover:` variants for every theme token. Exposed so a consumer (the CMS
 * className widget) can check a class against the same set the stylesheet generates.
 */
export const getThemeSafelistPatterns = (): readonly string[] => {
  const colors = braces(getThemeColorNames());
  const prefixes = braces(THEME_SAFELIST_PREFIXES);
  const hoverPrefixes = braces(THEME_SAFELIST_HOVER_PREFIXES);

  return [`${prefixes}-${colors}`, `hover:${hoverPrefixes}-${colors}`];
};

/**
 * @public
 * @description Builds `theme-safelist.css`: Tailwind v4 `@source inline()`
 * rules that force a color utility for every theme token, so classes authored
 * as data (CMS content) generate even though no source file mentions them.
 * Import the committed file after `tailwindcss` in an app stylesheet.
 */
export const buildThemeSafelist = (): string => {
  // Prettier's shape (single quotes, one argument per line), so the format
  // hook leaves the committed file byte-identical to this output.
  const rule = (pattern: string): string => {
    return `@source inline(\n  '${pattern}'\n);`;
  };

  return [
    `/* ${THEME_SAFELIST_BANNER} */`,
    '',
    ...getThemeSafelistPatterns().map(rule),
    '',
  ].join('\n');
};

const renderTokenBlock = (tokens: ThemeTokens): string => {
  return THEME_TOKEN_NAMES.map((name) => `  --${name}: ${tokens[name]};`).join(
    '\n',
  );
};

/**
 * @public
 * @description Builds the CSS for a set of {@link Theme}s as scoped token
 * overrides. Each theme emits an `html[data-theme="id"]` block (light) and an
 * `html[data-theme="id"].dark` block (dark), whose selector specificity beats
 * the base `:root` / `prefers-color-scheme` rules in `theme.css`. Render the
 * result in a single SSR `<style>` in the document head so the palette is
 * present on first paint (no flash), then set `data-theme` / `.dark` on
 * `<html>` to activate a theme.
 */
export const buildThemeStylesheet = (themes: readonly Theme[]): string => {
  return themes
    .map(
      (theme) =>
        `html[data-theme="${theme.id}"] {\n${renderTokenBlock(theme.light)}\n}\n` +
        `html[data-theme="${theme.id}"].dark {\n${renderTokenBlock(theme.dark)}\n}`,
    )
    .join('\n\n');
};

/** @public Looks up a theme by id. */
export const getTheme = (id: string): Theme | undefined => {
  return THEMES.find((theme) => theme.id === id);
};

/** @public Type guard: whether `value` is a registered theme id. */
export const isThemeId = (value: unknown): value is string => {
  return (
    typeof value === 'string' && THEMES.some((theme) => theme.id === value)
  );
};

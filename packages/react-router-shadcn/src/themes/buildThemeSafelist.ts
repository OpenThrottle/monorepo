import {
  THEME_SAFELIST_BANNER,
  THEME_SAFELIST_HOVER_PREFIXES,
  THEME_SAFELIST_PREFIXES,
  THEME_TOKEN_COLOR_ALIASES,
} from './data/data.theme-safelist';
import { THEME_TOKEN_NAMES } from './theme-contract';

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

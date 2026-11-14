import { getThemeSafelistPatterns } from '@openthrottle/react-router-shadcn';

import { CMS_SAFELIST_GROUPS } from '../data/data.cms-safelist';

/**
 * @public
 * @description Expands a Tailwind v4 `@source inline()` brace pattern into the class names it
 * stands for: `p{x,y}-{1,2}` → `px-1`, `px-2`, `py-1`, `py-2`. Handles any number of
 * sequential (not nested) brace groups, which is every pattern the safelists use.
 */
export const expandBracePattern = (pattern: string): readonly string[] => {
  const open = pattern.indexOf('{');

  if (open === -1) {
    return [pattern];
  }

  const close = pattern.indexOf('}', open);
  const head = pattern.slice(0, open);
  const options = pattern.slice(open + 1, close).split(',');
  const tails = expandBracePattern(pattern.slice(close + 1));

  return options.flatMap((option) => {
    return tails.map((tail) => {
      return `${head}${option}${tail}`;
    });
  });
};

/**
 * @public
 * @description Every class the CMS stylesheet is guaranteed to generate: the theme-token
 * safelist from `@openthrottle/react-router-shadcn` plus {@link CMS_SAFELIST_GROUPS}. Built from
 * the same patterns the generated `*-safelist.css` files emit, so the two cannot drift.
 */
export const getSafelistedClasses = (): ReadonlySet<string> => {
  const patterns = [
    ...getThemeSafelistPatterns(),
    ...Object.values(CMS_SAFELIST_GROUPS).flat(),
  ];

  return new Set(patterns.flatMap(expandBracePattern));
};

/**
 * @public
 * @description The classes in a space-separated `className` value that are not in `safelisted`,
 * de-duplicated in the order typed. These may silently not render in CMS content.
 */
export const findUnsupportedClasses = (
  value: string,
  safelisted: ReadonlySet<string>,
): readonly string[] => {
  const classes = value.split(/\s+/).filter((name) => {
    return name !== '' && !safelisted.has(name);
  });

  return [...new Set(classes)];
};

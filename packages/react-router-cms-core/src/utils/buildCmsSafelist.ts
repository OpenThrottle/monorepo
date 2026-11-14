import {
  CMS_SAFELIST_BANNER,
  CMS_SAFELIST_GROUPS,
} from '../data/data.cms-safelist';

/** @description Prettier's `printWidth`; a rule that fits stays on one line. */
const PRINT_WIDTH = 80;

/**
 * @description One `@source inline()` rule in Prettier's shape — single line when it fits,
 * otherwise one argument per line — so the format hook leaves the committed file byte-identical.
 */
const toRule = (pattern: string): string => {
  const singleLine = `@source inline('${pattern}');`;

  if (singleLine.length <= PRINT_WIDTH) {
    return singleLine;
  }

  return `@source inline(\n  '${pattern}'\n);`;
};

/**
 * @public
 * @description Builds `cms-safelist.css`: Tailwind v4 `@source inline()` rules that force the
 * non-theme utilities in {@link CMS_SAFELIST_GROUPS}, so classes authored as CMS content
 * generate even though no source file mentions them. Import the committed file after
 * `tailwindcss` in an app stylesheet.
 */
export const buildCmsSafelist = (): string => {
  const groups = Object.entries(CMS_SAFELIST_GROUPS).map(([name, patterns]) => {
    return [`/* ${name} */`, ...patterns.map(toRule)].join('\n');
  });

  return [`/* ${CMS_SAFELIST_BANNER} */`, ...groups].join('\n\n') + '\n';
};

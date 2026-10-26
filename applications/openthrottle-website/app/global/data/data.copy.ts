/**
 * Copy and links shared across route areas. Components under `app/global/`
 * stay presentational and read their strings from here.
 */

export const GLOBAL_FOOTER = {
  blogLink: { href: '/blog', label: 'Blog' },
  navAriaLabel: 'Footer',
} as const;

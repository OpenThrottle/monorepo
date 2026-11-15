/**
 * Copy and links shared across route areas. Components under `app/global/`
 * stay presentational and read their strings from here.
 */

export const GLOBAL_FOOTER = {
  blogLink: { href: '/blog', label: 'Blog' },
  navAriaLabel: 'Footer',
  /**
   * @description The public GitHub Sponsors page for the OpenThrottle org — the
   * org is the enrolled sponsee, not an individual — so it resolves for
   * logged-out visitors. `FUNDING.md` says what the tiers actually cover.
   */
  sponsorLink: {
    href: `https://github.com/sponsors/OpenThrottle`,
    label: `Sponsor`,
    prompt: `Hosting and CI come out of pocket.`,
  },
  versionLabel: 'Version',
} as const;

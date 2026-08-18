/**
 * @description Copy and destination for the sponsorship link in
 * {@link GlobalFooter}. The href points at the public GitHub Sponsors page for
 * the OpenThrottle org — the org is the enrolled sponsee, not an individual —
 * so it resolves for logged-out visitors. See `FUNDING.md` for what the tiers
 * actually cover.
 */
export const GLOBAL_FOOTER_SPONSOR_COPY = {
  href: `https://github.com/sponsors/OpenThrottle`,
  label: `Sponsor`,
  prompt: `Hosting and CI come out of pocket.`,
} as const;

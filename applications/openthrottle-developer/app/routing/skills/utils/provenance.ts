/**
 * @description Maps a `skillAvailability` provenance string (closed grammar; see
 * docs/monorepo/skill-availability-design.md "Output contract") to a short
 * human-readable description for the common rungs. The RAW provenance string is
 * always kept visible in the UI (monospace, secondary) — this is only a
 * friendly gloss for `frontmatter:*`, `posture:deny`, `tag-*`, and `slug-*`.
 * Unknown shapes fall back to the raw string. DISPLAY ONLY.
 */

/**
 * @description Human description for the decisive-rung provenance. Never throws;
 * an unrecognized shape returns the raw string so nothing is hidden.
 */
export const describeProvenance = (provenance: string): string => {
  switch (provenance) {
    case 'frontmatter:false':
      return 'From skill frontmatter (disable-model-invocation: false)';
    case 'frontmatter:true':
      return 'From skill frontmatter (disable-model-invocation: true)';
    case 'frontmatter:unset':
      return 'From skill frontmatter (disable-model-invocation unset)';
    case 'posture:deny':
      return "Denied by the project's deny posture";
    default:
      break;
  }

  const [category, detail] = provenance.split(':', 2);
  const tag = detail === undefined ? '' : detail.split('@', 1)[0];

  switch (category) {
    case 'slug-allow':
      return 'Allowed by a slug exception rule';
    case 'slug-deny':
      return 'Denied by a slug exception rule';
    case 'tag-allow':
      return tag.length > 0
        ? `Allowed by a tag rule (${tag})`
        : 'Allowed by a tag rule';
    case 'tag-deny':
      return tag.length > 0
        ? `Denied by a tag rule (${tag})`
        : 'Denied by a tag rule';
    default:
      return provenance;
  }
};

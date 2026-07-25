/**
 * @description Canonicalizes a git remote URL for repository identity. Rules per
 * applications/openthrottle-server/docs/workspace-onboarding-repository-model-design.md §2:
 * ssh shorthand and ssh:// convert to https, http upgrades to https, userinfo drops,
 * the host lowercases, and trailing `.git` / `/` strip. Returns null for empty or
 * unrecognizable input (the caller treats that as a provisional, local-only repository).
 * Keep in sync with the SQL twin in databases/migrations/078_create_repositories_and_checkouts.sql.
 *
 * @public
 */
export function normalizeRemoteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  let url = trimmed
    .replace(/^git@([^:/]+):/, 'https://$1/')
    .replace(/^ssh:\/\/(?:[^@/]+@)?/, 'https://')
    .replace(/^http:\/\//, 'https://')
    .replace(/^https:\/\/[^@/]+@/, 'https://');

  if (!/^https:\/\/[^/]+\/.+/.test(url)) return null;

  url = url.replace(/\.git$/, '').replace(/\/+$/, '');

  const withoutScheme = url.slice('https://'.length);
  const slashIndex = withoutScheme.indexOf('/');
  if (slashIndex === -1) return null;

  const host = withoutScheme.slice(0, slashIndex).toLowerCase();
  const path = withoutScheme.slice(slashIndex);
  return `https://${host}${path}`;
}

/**
 * Zero-dependency twin of the server's `normalizeRemoteUrl`
 * (`packages/nestjs-repositories/src/modules/repositories/repositories.utils.ts`). The hook bundle
 * must stay dependency-light, so it cannot import that package; the two are kept identical by a
 * mirrored test (`__tests__/normalizeRemoteUrl.test.ts`). Change them together or not at all.
 *
 * Runs client-side BEFORE a remote leaves the machine, because a raw remote can carry
 * `https://user:token@…` credentials.
 */

/**
 * @description Canonical `https://<host>/<path>` form of a git remote — host lowercased, userinfo,
 * trailing `.git` and trailing slashes dropped, ssh shorthand and `ssh://` upgraded to https — or
 * null for empty or unrecognizable input.
 * @public
 */
export const normalizeRemoteUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }

  let url = trimmed
    .replace(/^git@([^:/]+):/, 'https://$1/')
    .replace(/^ssh:\/\/(?:[^@/]+@)?/, 'https://')
    .replace(/^http:\/\//, 'https://')
    .replace(/^https:\/\/[^@/]+@/, 'https://');

  if (!/^https:\/\/[^/]+\/.+/.test(url)) {
    return null;
  }

  url = url.replace(/\.git$/, '').replace(/\/+$/, '');

  const withoutScheme = url.slice('https://'.length);
  const slashIndex = withoutScheme.indexOf('/');
  if (slashIndex === -1) {
    return null;
  }

  const host = withoutScheme.slice(0, slashIndex).toLowerCase();
  const path = withoutScheme.slice(slashIndex);
  return `https://${host}${path}`;
};

/**
 * @description Browser-safe git-remote identity parsing for the composer's
 * repository picker. This is the client twin of `normalizeRemoteUrl` in
 * `@openthrottle/nestjs-repositories` (which itself mirrors the SQL twin in
 * `databases/migrations/078_create_repositories_and_checkouts.sql`): the same
 * normalization rules, but returning the SPLIT identity (`host` / `owner` /
 * `name`) the UI needs to group and disambiguate rows rather than a canonical
 * URL string. Pure — no DOM or node APIs — so it runs inside the client bundle. It lives
 * here rather than in `react-router-chat-state` because the dependency runs
 * state → chat, and the picker that consumes it is in this package.
 */

/** Path separator used by both the filesystem paths and the remote URL paths we shorten. */
const PATH_SEPARATOR = '/';

/** How many trailing path segments {@link shortenFilesystemPath} keeps by default. */
const DEFAULT_PATH_SEGMENTS = 2;

/** Leading ellipsis marking a filesystem path that was shortened. */
const ELLIPSIS = '…';

/**
 * The split identity of a git remote: the lowercased host, the owner (an
 * organization/user, or a slash-joined nested GitLab group path) and the
 * repository name.
 * @public
 */
export interface RepositoryRemoteIdentity {
  /** Lowercased remote host, e.g. `github.com` or a self-hosted `git.internal.example`. */
  readonly host: string;
  /** Trailing path segment, `.git` stripped, e.g. `monorepo`. */
  readonly name: string;
  /** Everything between host and name, e.g. `openthrottle` or `group/subgroup`. */
  readonly owner: string;
}

/**
 * Split a git remote URL into `{ host, name, owner }`. Accepts the shapes git
 * itself accepts — `git@host:owner/repo.git`, `ssh://[user@]host/owner/repo`,
 * `http(s)://[user@]host/owner/repo` — stripping userinfo, lowercasing the host
 * and dropping a trailing `.git` or `/`. Nested GitLab groups collapse into the
 * owner (`host/group/sub/repo` → `owner: 'group/sub'`, `name: 'repo'`).
 *
 * Returns `null` for empty, missing or unrecognizable input, which is the
 * everyday case for a provisional local-only checkout with no remote — callers
 * fall back to {@link shortenFilesystemPath} there.
 *
 * @public
 */
export function parseRepositoryRemote(
  remoteUrl: string | null | undefined,
): RepositoryRemoteIdentity | null {
  if (remoteUrl == null) return null;

  const trimmed = remoteUrl.trim();
  if (trimmed === '') return null;

  // Normalize every accepted shape onto `https://host/path` first, exactly as
  // the server twin does, so the split below has a single form to reason about.
  const normalized = trimmed
    .replace(/^git@([^:/]+):/, 'https://$1/')
    .replace(/^ssh:\/\/(?:[^@/]+@)?/, 'https://')
    .replace(/^http:\/\//, 'https://')
    .replace(/^https:\/\/[^@/]+@/, 'https://');

  if (!/^https:\/\/[^/]+\/.+/.test(normalized)) return null;

  // Trailing slashes strip BEFORE `.git`, so a `…/repo.git/` remote (which git
  // itself accepts) still yields `repo` rather than `repo.git`.
  const withoutScheme = normalized
    .slice('https://'.length)
    .replace(/\/+$/, '')
    .replace(/\.git$/, '');

  const segments = withoutScheme
    .split(PATH_SEPARATOR)
    .filter((segment) => segment !== '');

  // host + owner + name is the minimum that yields an identity; a bare
  // `https://host/repo` has no owner to group by, so it is unparseable here.
  if (segments.length < 3) return null;

  const [host, ...pathSegments] = segments;
  const name = pathSegments[pathSegments.length - 1];
  const owner = pathSegments.slice(0, -1).join(PATH_SEPARATOR);

  if (host === undefined || name === undefined || owner === '') return null;

  return { host: host.toLowerCase(), name, owner };
}

/**
 * Shorten an absolute filesystem path to its last `segments` parts, prefixed
 * with an ellipsis when anything was dropped (e.g.
 * `/Users/matt/Development/openthrottle` → `…/Development/openthrottle`). Used
 * as the row qualifier for local-only checkouts that have no remote to parse.
 *
 * @public
 */
export function shortenFilesystemPath(
  path: string,
  segments: number = DEFAULT_PATH_SEGMENTS,
): string {
  const parts = path.split(PATH_SEPARATOR).filter((part) => part !== '');
  if (parts.length <= segments) return path;

  const kept = parts.slice(parts.length - segments).join(PATH_SEPARATOR);
  return `${ELLIPSIS}${PATH_SEPARATOR}${kept}`;
}

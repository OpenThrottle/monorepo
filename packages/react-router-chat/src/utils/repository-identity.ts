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
 * Characters {@link shortenBranchName} keeps by default, ellipsis included.
 * Sized so the shortened string FITS the row's `max-w-44` branch column at
 * `text-xs` (~7.2px/char measured in the app, so ~130px of the ~154px the
 * column leaves after the git icon and its gap).
 *
 * The relationship between this cap and that column is load-bearing, not
 * cosmetic: a cap WIDER than its column gets end-clipped by `truncate`, which
 * eats the tail this helper exists to preserve — you get the cost of both
 * truncations and the benefit of neither. Measured live in the developer app:
 * 24 clipped, 20 still clipped by 7px, 18 fits with ~24px to spare. Change one
 * of the two and re-measure the other. The trigger's face is narrower still and
 * passes its own, smaller value.
 */
const DEFAULT_BRANCH_LENGTH = 18;

/**
 * Share of a shortened branch's budget spent on the head. The tail gets the
 * rest, because the tail is the half that distinguishes two branches sharing an
 * author/tool prefix — see the branch-truncation contract on
 * `ChatCheckoutSelectorRow`.
 */
const BRANCH_HEAD_RATIO = 0.4;

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

/**
 * Shorten a git branch name to at most `maxLength` characters by dropping its
 * middle, keeping both the head and — deliberately the larger share — the tail
 * (e.g. `visormatt/bootstrap-service-accounts` →
 * `visormatt/…-service-accounts`). The sibling of
 * {@link shortenFilesystemPath}, and character-count based for the same reason:
 * measuring rendered text would need a `ResizeObserver`, which is a no-op in
 * jsdom.
 *
 * End-ellipsis would be the wrong half here. Branches in a real workspace share
 * a short author/tool prefix (`visormatt/`, `claude/`) and differ in their tail,
 * so cutting the tail renders unrelated branches identically.
 *
 * @public
 */
export function shortenBranchName(
  branch: string,
  maxLength: number = DEFAULT_BRANCH_LENGTH,
): string {
  if (branch.length <= maxLength) return branch;
  // Nothing legible survives a budget this small, so spend it all on the tail.
  if (maxLength <= 2) return branch.slice(branch.length - maxLength);

  const budget = maxLength - ELLIPSIS.length;
  const head = Math.floor(budget * BRANCH_HEAD_RATIO);
  const tail = budget - head;

  return `${branch.slice(0, head)}${ELLIPSIS}${branch.slice(branch.length - tail)}`;
}

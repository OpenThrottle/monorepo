import { ChatCheckoutKind } from '../types';

/** Marks text that was shortened. One glyph, so it costs one column. */
const ELLIPSIS = '…';

const PATH_SEPARATOR = '/';

/**
 * A macOS (`/Users/<name>`) or Linux (`/home/<name>`) home directory prefix.
 * The client cannot ask the host for `$HOME`, but these two layouts cover every
 * checkout a developer registers by hand, and the ones they don't fall through
 * to plain tail-fitting.
 */
const HOME_PREFIX = /^\/(?:Users|home)\/[^/]+(?=\/|$)/;

/**
 * Narrow the server's free-text checkout `kind` onto {@link ChatCheckoutKind}.
 * Anything unrecognized is `undefined`, which the picker reads as primary —
 * it only nests a row as a worktree when it positively knows it is one.
 *
 * @public
 */
export function toCheckoutKind(
  kind: string | null | undefined,
): ChatCheckoutKind | undefined {
  if (kind === ChatCheckoutKind.primary) return ChatCheckoutKind.primary;
  if (kind === ChatCheckoutKind.worktree) return ChatCheckoutKind.worktree;
  return undefined;
}

/**
 * @description Middle-ellipsize a branch name to at most `maxChars`. Branches
 * carry signal at BOTH ends — the `feat/` / `fix/` / `owner/` prefix and the
 * distinguishing tail (`plan-0b6dfaf8`) — so an end-clipping `truncate` throws
 * away the half that tells two branches apart. The tail gets the larger share.
 *
 * Size `maxChars` to FIT the CSS column it renders in: a cap wider than the
 * column makes the browser end-clip the already-shortened string, and you pay
 * for both truncations while keeping neither tail.
 *
 * @public
 */
export function shortenBranchName(branch: string, maxChars: number): string {
  if (branch.length <= maxChars) return branch;

  const budget = Math.max(maxChars - ELLIPSIS.length, 2);
  const head = Math.floor(budget * 0.4);
  const tail = budget - head;

  return `${branch.slice(0, head)}${ELLIPSIS}${branch.slice(-tail)}`;
}

/**
 * @description Shorten an absolute checkout path for a row: the home directory
 * collapses to `~`, then as many TRAILING segments as fit in `maxChars` are
 * kept behind a `…/` marker. The tail is what differs between checkouts (the
 * folder name, the worktree name); the leading `/Users/<name>/Development` is
 * the same on every row. The last segment is always kept, even when it alone
 * exceeds the budget — CSS `truncate` is the backstop there.
 *
 * @public
 */
export function shortenCheckoutPath(path: string, maxChars: number): string {
  const homeRelative = path.replace(HOME_PREFIX, '~');
  if (homeRelative.length <= maxChars) return homeRelative;

  const segments = homeRelative
    .split(PATH_SEPARATOR)
    .filter((segment) => segment !== '');
  const marker = `${ELLIPSIS}${PATH_SEPARATOR}`;

  // Grow the kept tail one segment at a time while it still fits; one segment
  // is the floor.
  let keptCount = 1;
  while (keptCount < segments.length) {
    const candidate = segments.slice(-(keptCount + 1)).join(PATH_SEPARATOR);
    if (marker.length + candidate.length > maxChars) break;
    keptCount += 1;
  }

  return `${marker}${segments.slice(-keptCount).join(PATH_SEPARATOR)}`;
}

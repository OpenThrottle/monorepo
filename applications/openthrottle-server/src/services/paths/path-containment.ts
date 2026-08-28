/**
 * @description Path containment on SEGMENT boundaries, so `/repo-two` is never treated as living
 * inside `/repo`. A naive `startsWith` gets that wrong, and getting it wrong here would resolve a
 * plan's workspace to a neighbouring repository.
 *
 * Both paths are expected to be absolute and already symlink-resolved (see {@link realPath}).
 */

import { sep } from 'node:path';

/** Drops trailing separators so `/repo/` and `/repo` compare equal (never strips the root itself). */
const withoutTrailingSeparator = (value: string): string =>
  value.length > 1 && value.endsWith(sep) ? value.slice(0, -1) : value;

/** @description True when `candidate` IS `parent` or sits anywhere beneath it. */
export const isPathWithin = (parent: string, candidate: string): boolean => {
  const root = withoutTrailingSeparator(parent);
  const path = withoutTrailingSeparator(candidate);

  if (path === root) return true;

  return path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
};

/** @description Depth in path segments, used to pick the DEEPEST containing match. */
export const pathDepth = (value: string): number =>
  withoutTrailingSeparator(value).split(sep).filter(Boolean).length;

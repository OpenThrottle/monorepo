import type { WorkspaceBreadcrumbSegment } from '~/routing/settings/repositories/data/types';

/** Cumulative POSIX breadcrumb segments, marking those still under a root. */
export const buildBreadcrumbs = (
  path: string,
  roots: string[],
): WorkspaceBreadcrumbSegment[] => {
  const parts = path.split('/').filter((part) => part !== '');
  const isNavigable = (candidate: string): boolean =>
    roots.some(
      (root) => candidate === root || candidate.startsWith(`${root}/`),
    );

  let accumulated = '';
  return parts.map((part) => {
    accumulated = `${accumulated}/${part}`;
    return {
      label: part,
      navigable: isNavigable(accumulated),
      path: accumulated,
    };
  });
};

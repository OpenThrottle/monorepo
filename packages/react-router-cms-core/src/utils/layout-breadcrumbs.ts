import type { CmsFragment } from '../types';

/**
 * @public
 */
export interface CmsBreadcrumb {
  readonly typename: string;
  readonly uuid: string;
}

/**
 * @public
 */
export interface GetLayoutBreadcrumbsOptions {
  readonly fragmentUuid: string | undefined;
  readonly layout: CmsFragment;
}

const findPath = (
  fragment: CmsFragment,
  fragmentUuid: string,
  parents: readonly CmsBreadcrumb[],
): readonly CmsBreadcrumb[] | undefined => {
  const path = [
    ...parents,
    { typename: fragment.typename, uuid: fragment.uuid },
  ];

  if (fragment.uuid === fragmentUuid) {
    return path;
  }

  for (const child of fragment.children) {
    const found = findPath(child, fragmentUuid, path);
    if (found) {
      return found;
    }
  }

  return undefined;
};

/**
 * @description The path from the layout down to `fragmentUuid`, as `{ typename, uuid }` pairs.
 * The layout root itself is left out, so a fragment directly under the root yields one crumb and
 * the root yields none. Returns an empty list when `fragmentUuid` is absent or not in the tree.
 * @public
 */
export const getLayoutBreadcrumbs = (
  options: GetLayoutBreadcrumbsOptions,
): readonly CmsBreadcrumb[] => {
  const { fragmentUuid, layout } = options;

  if (fragmentUuid === undefined) {
    return [];
  }

  const path = findPath(layout, fragmentUuid, []);

  return path ? path.slice(1) : [];
};

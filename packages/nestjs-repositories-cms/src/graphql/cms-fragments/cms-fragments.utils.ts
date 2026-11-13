import type { CmsFragmentTreeRow } from '../cms-fragment-tree/cms-fragment-tree.types.ts';
import type {
  CmsFragmentCloneEdge,
  CmsFragmentClonePlan,
  CmsFragmentCloneRow,
} from './cms-fragments.types.ts';

/**
 * @description Plans the copy of a fragment tree, as the tree query returns it (one row per
 * occurrence, in any order; the depth-0 row is the root). Every occurrence gets its own new fragment, so the copy is a tree by construction: a fragment
 * shared by two parents is copied twice, and a stored cycle (already cut by the tree query) is
 * not reproduced. The root copy takes `rootName` and is never `is_system`; descendants keep
 * their name and flag. Returns null when there is no root row.
 */
export function planCmsFragmentClone(
  rows: readonly CmsFragmentTreeRow[],
  rootName: string,
  createUuid: () => string,
): CmsFragmentClonePlan | null {
  const uuidByKey = new Map<string, string>();
  const fragments: CmsFragmentCloneRow[] = [];
  const edges: CmsFragmentCloneEdge[] = [];

  const byDepth = [...rows].sort((a, b) => {
    return a.depth - b.depth;
  });

  for (const row of byDepth) {
    const key = row.path.join('/');
    const parentKey = row.path.slice(0, -1).join('/');
    const uuid = createUuid();
    const isRoot = row.depth === 0 && fragments.length === 0;
    const parentUuid = uuidByKey.get(parentKey);

    if (!isRoot && parentUuid === undefined) {
      continue;
    }

    uuidByKey.set(key, uuid);
    fragments.push({
      isSystem: isRoot ? false : row.isSystem,
      name: isRoot ? rootName : row.name,
      properties: row.properties,
      schemaUuid: row.schemaUuid,
      typename: row.typename,
      uuid,
    });

    if (parentUuid !== undefined) {
      edges.push({ childUuid: uuid, parentUuid, sortOrder: row.position });
    }
  }

  const root = fragments[0];

  if (root === undefined) {
    return null;
  }

  return { edges, fragments, rootUuid: root.uuid };
}

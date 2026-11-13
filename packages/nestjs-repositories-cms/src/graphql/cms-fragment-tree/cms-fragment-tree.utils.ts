import type {
  CmsFragmentTreeNode,
  CmsFragmentTreeRow,
} from './cms-fragment-tree.types.ts';

/**
 * @description The occurrence key of a uuid path.
 */
export function toCmsFragmentKey(path: readonly string[]): string {
  return path.join('/');
}

/**
 * @description Orders siblings by `sort_order`, then by when the edge was made, then by uuid,
 * so equal `sort_order`s (the column defaults to 0) still read the same every time.
 */
export function compareCmsFragmentSiblings(
  left: CmsFragmentTreeRow,
  right: CmsFragmentTreeRow,
): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  const leftTime = left.edgeCreatedAt?.getTime() ?? 0;
  const rightTime = right.edgeCreatedAt?.getTime() ?? 0;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.uuid.localeCompare(right.uuid);
}

/**
 * @description Turns CTE rows into a pre-order list of nodes (root first, each node before its
 * children, siblings in order), each carrying its `childKeys`. Rows whose parent is missing
 * (cut by depth or soft delete upstream) are dropped. Returns an empty list when no row is a root.
 */
export function buildCmsFragmentTreeNodes(
  rows: readonly CmsFragmentTreeRow[],
): CmsFragmentTreeNode[] {
  const childrenByParent = new Map<string, CmsFragmentTreeRow[]>();
  const roots: CmsFragmentTreeRow[] = [];

  for (const row of rows) {
    if (row.path.length <= 1) {
      roots.push(row);
      continue;
    }

    const parentKey = toCmsFragmentKey(row.path.slice(0, -1));
    const siblings = childrenByParent.get(parentKey) ?? [];

    siblings.push(row);
    childrenByParent.set(parentKey, siblings);
  }

  const nodes: CmsFragmentTreeNode[] = [];
  const visit = (row: CmsFragmentTreeRow, parentKey: string | null): void => {
    const key = toCmsFragmentKey(row.path);
    const children = [...(childrenByParent.get(key) ?? [])].sort(
      compareCmsFragmentSiblings,
    );

    nodes.push({
      childKeys: children.map((child) => toCmsFragmentKey(child.path)),
      depth: row.depth,
      isSystem: row.isSystem,
      key,
      name: row.name,
      parentKey,
      position: row.position,
      properties: row.properties,
      schemaUuid: row.schemaUuid,
      typename: row.typename,
      uuid: row.uuid,
    });

    for (const child of children) {
      visit(child, key);
    }
  };

  for (const root of roots) {
    visit(root, null);
  }

  return nodes;
}

/**
 * @description Narrows a CTE result row (`any` from the driver) to {@link CmsFragmentTreeRow}.
 */
export function parseCmsFragmentTreeRow(
  value: unknown,
): CmsFragmentTreeRow | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const depth: unknown = Reflect.get(value, 'depth');
  const edgeCreatedAt: unknown = Reflect.get(value, 'edge_created_at');
  const isSystem: unknown = Reflect.get(value, 'is_system');
  const name: unknown = Reflect.get(value, 'name');
  const path: unknown = Reflect.get(value, 'path');
  const position: unknown = Reflect.get(value, 'position');
  const properties: unknown = Reflect.get(value, 'properties');
  const schemaUuid: unknown = Reflect.get(value, 'schema_uuid');
  const typename: unknown = Reflect.get(value, 'typename');
  const uuid: unknown = Reflect.get(value, 'uuid');
  const isPath =
    Array.isArray(path) && path.every((segment) => typeof segment === 'string');
  const isProperties =
    typeof properties === 'object' &&
    properties !== null &&
    !Array.isArray(properties);

  if (
    typeof depth !== 'number' ||
    !(edgeCreatedAt === null || edgeCreatedAt instanceof Date) ||
    typeof name !== 'string' ||
    !isPath ||
    typeof position !== 'number' ||
    !isProperties ||
    typeof schemaUuid !== 'string' ||
    typeof typename !== 'string' ||
    typeof uuid !== 'string'
  ) {
    return null;
  }

  return {
    depth,
    edgeCreatedAt,
    isSystem: isSystem === true,
    name,
    path: path.filter((segment) => typeof segment === 'string'),
    position,
    properties: toPlainRecord(properties),
    schemaUuid,
    typename,
    uuid,
  };
}

/**
 * @description Copies an object's own enumerable entries into a plain record.
 */
function toPlainRecord(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value));
}

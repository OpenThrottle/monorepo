import type { Layout } from '../../modules/layouts/layout.entity.ts';
import type { CmsFragmentTreeNode } from '../cms-fragment-tree/cms-fragment-tree.types.ts';
import type {
  CmsFragmentNodeObject,
  CmsLayoutObject,
  CmsLayoutSummaryObject,
} from './cms-layouts.object.ts';

/**
 * @description Maps one tree node to its GraphQL object.
 */
export function toCmsFragmentNodeObject(
  node: CmsFragmentTreeNode,
): CmsFragmentNodeObject {
  return {
    childKeys: [...node.childKeys],
    depth: node.depth,
    isSystem: node.isSystem,
    key: node.key,
    name: node.name,
    parentKey: node.parentKey,
    position: node.position,
    propertiesJson: JSON.stringify(node.properties),
    schemaUuid: node.schemaUuid,
    typename: node.typename,
    uuid: node.uuid,
  };
}

/**
 * @description Maps a layout row and its tree to the GraphQL object.
 */
export function toCmsLayoutObject(
  layout: Layout,
  nodes: readonly CmsFragmentTreeNode[],
): CmsLayoutObject {
  return {
    createdAt: layout.createdAt,
    fragmentUuid: layout.fragmentUuid,
    fragments: nodes.map(toCmsFragmentNodeObject),
    metadataJson: JSON.stringify(layout.metadata),
    name: layout.name,
    slug: layout.slug,
    status: layout.status,
    tags: [...layout.tags],
    updatedAt: layout.updatedAt,
    uuid: layout.uuid,
  };
}

/**
 * @description Maps a layout row, without its tree, to the summary object.
 */
export function toCmsLayoutSummaryObject(
  layout: Layout,
): CmsLayoutSummaryObject {
  return {
    createdAt: layout.createdAt,
    fragmentUuid: layout.fragmentUuid,
    metadataJson: JSON.stringify(layout.metadata),
    name: layout.name,
    slug: layout.slug,
    status: layout.status,
    tags: [...layout.tags],
    updatedAt: layout.updatedAt,
    uuid: layout.uuid,
  };
}

/**
 * @description One row of the fragment-tree CTE: one occurrence of a fragment, identified by the
 * uuid path from the root to it. A fragment shared by two parents yields two rows.
 * @public
 */
export interface CmsFragmentTreeRow {
  readonly depth: number;
  /** When the parent → child edge was created; breaks `position` ties. Null for the root. */
  readonly edgeCreatedAt: Date | null;
  readonly isSystem: boolean;
  readonly name: string;
  /** uuids from the root to this fragment, inclusive. */
  readonly path: readonly string[];
  /** `fragments_children.sort_order` of the edge into this node; 0 for the root. */
  readonly position: number;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly schemaUuid: string;
  readonly typename: string;
  readonly uuid: string;
}

/**
 * @description One occurrence of a fragment in a layout tree, flattened. `key` is unique per
 * occurrence; `parentKey` and `childKeys` link occurrences, so the list is a tree by
 * construction even when fragments are shared or the stored graph has a cycle.
 * @public
 */
export interface CmsFragmentTreeNode {
  readonly childKeys: readonly string[];
  readonly depth: number;
  readonly isSystem: boolean;
  readonly key: string;
  readonly name: string;
  readonly parentKey: string | null;
  readonly position: number;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly schemaUuid: string;
  readonly typename: string;
  readonly uuid: string;
}

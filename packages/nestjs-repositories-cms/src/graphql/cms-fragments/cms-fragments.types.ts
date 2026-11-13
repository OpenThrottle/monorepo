/**
 * @description One fragment row a clone inserts.
 */
export interface CmsFragmentCloneRow {
  readonly isSystem: boolean;
  readonly name: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly schemaUuid: string;
  readonly typename: string;
  readonly uuid: string;
}

/**
 * @description One parent → child edge a clone inserts.
 */
export interface CmsFragmentCloneEdge {
  readonly childUuid: string;
  readonly parentUuid: string;
  readonly sortOrder: number;
}

/**
 * @description What cloning a subtree inserts: `rootUuid` is the copy of the first row.
 */
export interface CmsFragmentClonePlan {
  readonly edges: readonly CmsFragmentCloneEdge[];
  readonly fragments: readonly CmsFragmentCloneRow[];
  readonly rootUuid: string;
}

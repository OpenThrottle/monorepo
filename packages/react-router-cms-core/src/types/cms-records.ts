import type { CmsStatus } from '../config';

/**
 * @description A stored layout row: a named, slugged entry point into a fragment tree. Field names
 * mirror the database columns.
 * @public
 */
export interface CmsLayout {
  readonly created_at: string;
  readonly fragment_uuid: string;
  readonly is_deleted: boolean | null;
  readonly metadata: unknown;
  readonly name: string;
  readonly slug: string;
  readonly status: CmsStatus;
  readonly tags: readonly string[];
  readonly updated_at: string;
  readonly uuid: string;
}

/**
 * @description A stored fragment row. Unlike {@link CmsFragment} it carries no children: the tree is
 * assembled from rows, not stored as one.
 * @public
 */
export interface CmsFragmentRecord {
  readonly created_at: string;
  readonly is_deleted: boolean | null;
  readonly is_system: boolean | null;
  readonly name: string;
  readonly properties: unknown;
  readonly schema_uuid: string;
  readonly typename: string;
  readonly updated_at: string;
  readonly uuid: string;
}

/**
 * @description A stored, versioned JSON schema for one fragment `typename`.
 * @public
 */
export interface CmsSchema {
  readonly created_at: string;
  readonly is_deleted: boolean | null;
  readonly json_schema: unknown;
  readonly status: CmsStatus;
  readonly typename: string;
  readonly updated_at: string;
  readonly uuid: string;
  readonly version: string;
}

import type {
  CmsFragment,
  CmsFragmentRecord,
  CmsParsedSchema,
  CmsStatus,
} from '@openthrottle/react-router-cms-core';
import {
  CMS_STATUS,
  getFormFieldKind,
  parseCmsSchema,
} from '@openthrottle/react-router-cms-core';

import type { CmsFragmentNodeInput } from '~/global/utils/toCmsFragments';
import { toCmsFragments } from '~/global/utils/toCmsFragments';

/**
 * @description Why a GraphQL record could not become a cms-core row.
 */
export type CmsRecordFailure =
  'invalid-json' | 'not-a-schema' | 'not-an-object';

/**
 * @description The outcome of adapting one GraphQL record.
 */
export type CmsRecordResult<TValue> =
  | { readonly ok: false; readonly reason: CmsRecordFailure }
  | { readonly ok: true; readonly value: TValue };

/**
 * @description The `CmsFragmentObject` fields {@link toCmsFragmentRecord} reads. `createdAt` and
 * `updatedAt` are `DateTime`, which codegen leaves untyped.
 */
export interface CmsFragmentObjectInput {
  readonly createdAt: unknown;
  readonly isSystem: boolean;
  readonly name: string;
  readonly propertiesJson: string;
  readonly schemaUuid: string;
  readonly typename: string;
  readonly updatedAt: unknown;
  readonly uuid: string;
}

/**
 * @description The `CmsSchemaObject` fields {@link toCmsParsedSchema} reads.
 */
export interface CmsSchemaObjectInput {
  readonly createdAt: unknown;
  readonly jsonSchemaJson: string;
  /** Optional because codegen emits nullable GraphQL fields as optional members. */
  readonly status?: string | null | undefined;
  readonly typename: string;
  readonly updatedAt: unknown;
  readonly uuid: string;
  readonly version: string;
}

const CMS_STATUSES: readonly string[] = Object.values(CMS_STATUS);

const isCmsStatus = (value: unknown): value is CmsStatus => {
  return typeof value === 'string' && CMS_STATUSES.includes(value);
};

/**
 * @description A `DateTime` as the ISO string the cms-core rows carry.
 */
const toTimestamp = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === 'string' ? value : '';
};

/**
 * @description Parses a JSON-object string, or names why it is not one.
 */
const parseJsonObject = (
  json: string,
): CmsRecordResult<Readonly<Record<string, unknown>>> => {
  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, reason: 'not-an-object' };
  }

  return { ok: true, value: Object.fromEntries(Object.entries(value)) };
};

/**
 * @description The snake_case row for a fragment whose properties are already parsed.
 */
const toRecord = (
  fragment: CmsFragmentObjectInput,
  properties: Readonly<Record<string, unknown>>,
): CmsFragmentRecord => {
  return {
    created_at: toTimestamp(fragment.createdAt),
    is_deleted: false,
    is_system: fragment.isSystem,
    name: fragment.name,
    properties,
    schema_uuid: fragment.schemaUuid,
    typename: fragment.typename,
    updated_at: toTimestamp(fragment.updatedAt),
    uuid: fragment.uuid,
  };
};

/**
 * @description A `CmsFragmentObject` as the snake_case `CmsFragmentRecord` cms-core reads, with
 * `propertiesJson` parsed. GraphQL serves live fragments only, so `is_deleted` is `false`.
 */
export const toCmsFragmentRecord = (
  fragment: CmsFragmentObjectInput,
): CmsRecordResult<CmsFragmentRecord> => {
  const properties = parseJsonObject(fragment.propertiesJson);

  if (!properties.ok) {
    return properties;
  }

  return { ok: true, value: toRecord(fragment, properties.value) };
};

/**
 * @description A child fragment as a `CmsFragmentRecord` for the children list. Never fails: the
 * list shows only name and typename, and dropping a child with bad JSON would desync the order the
 * server checks a reorder against, so its properties fall back to `{}`.
 */
export const toCmsChildRecord = (
  child: CmsFragmentObjectInput,
): CmsFragmentRecord => {
  const properties = parseJsonObject(child.propertiesJson);

  return toRecord(child, properties.ok ? properties.value : {});
};

/**
 * @description A `CmsSchemaObject` as the `CmsParsedSchema` `CoreFormRenderer` takes:
 * `jsonSchemaJson` parsed and narrowed with `parseCmsSchema`. A missing or unknown `status` reads
 * as `DRAFT` — the form never consults it, and a nullable column should not block editing.
 */
export const toCmsParsedSchema = (
  schema: CmsSchemaObjectInput,
): CmsRecordResult<CmsParsedSchema> => {
  const jsonSchema = parseJsonObject(schema.jsonSchemaJson);

  if (!jsonSchema.ok) {
    return jsonSchema;
  }

  const parsed = parseCmsSchema({
    created_at: toTimestamp(schema.createdAt),
    is_deleted: false,
    json_schema: jsonSchema.value,
    status: isCmsStatus(schema.status) ? schema.status : CMS_STATUS.DRAFT,
    typename: schema.typename,
    updated_at: toTimestamp(schema.updatedAt),
    uuid: schema.uuid,
    version: schema.version,
  });

  if (!parsed) {
    return { ok: false, reason: 'not-a-schema' };
  }

  return { ok: true, value: parsed };
};

/**
 * @description A `cmsFragment` with its pinned `schema` selected.
 */
export interface CmsFragmentWithSchemaInput extends CmsFragmentObjectInput {
  /** Optional because codegen emits nullable GraphQL fields as optional members. */
  readonly children?: readonly CmsFragmentObjectInput[] | null | undefined;
  /** Optional because codegen emits nullable GraphQL fields as optional members. */
  readonly schema?: CmsSchemaObjectInput | null | undefined;
  /** The fragment's live subtree, root first; optional for the same codegen reason. */
  readonly tree?: readonly CmsFragmentNodeInput[] | null | undefined;
}

/**
 * @description What the fragment editor needs: the fragment row and the schema it is pinned to.
 */
export interface CmsFragmentEditorRecords {
  /** The fragment's live children, in order. */
  readonly children: readonly CmsFragmentRecord[];
  /** The fragment's stored properties, typed as the object they were parsed as. */
  readonly draft: Readonly<Record<string, unknown>>;
  readonly fragment: CmsFragmentRecord;
  /** Whether the schema has a `children` property, i.e. the fragment is a container. */
  readonly hasChildren: boolean;
  /** The fragment's children for the preview, each with its own subtree. */
  readonly previewChildren: readonly CmsFragment[];
  readonly schema: CmsParsedSchema;
}

/**
 * @description Why the fragment editor cannot open: the pinned schema row is gone, or a record
 * did not adapt.
 */
export type CmsFragmentEditorFailure = CmsRecordFailure | 'missing-schema';

/**
 * @description The outcome of {@link toCmsFragmentEditorRecords}.
 */
export type CmsFragmentEditorResult =
  | { readonly ok: false; readonly reason: CmsFragmentEditorFailure }
  | { readonly ok: true; readonly value: CmsFragmentEditorRecords };

const isPropertyRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * @description The preview's children: the subtree under the `tree` root when it was loaded,
 * otherwise the direct children alone (one level, no grandchildren).
 */
const toPreviewChildren = (
  tree: readonly CmsFragmentNodeInput[],
  children: readonly CmsFragmentRecord[],
): readonly CmsFragment[] => {
  const [root] = toCmsFragments(tree);

  if (root) {
    return root.children;
  }

  return children.map((child) => {
    return {
      children: [],
      properties: isPropertyRecord(child.properties) ? child.properties : {},
      typename: child.typename,
      uuid: child.uuid,
    };
  });
};

/**
 * @description Adapts a `cmsFragment` with its pinned `schema` selected into the editor's records.
 */
export const toCmsFragmentEditorRecords = (
  fragment: CmsFragmentWithSchemaInput,
): CmsFragmentEditorResult => {
  if (!fragment.schema) {
    return { ok: false, reason: 'missing-schema' };
  }

  const draft = parseJsonObject(fragment.propertiesJson);
  const record = toCmsFragmentRecord(fragment);
  const schema = toCmsParsedSchema(fragment.schema);

  if (!draft.ok) {
    return draft;
  }

  if (!record.ok) {
    return record;
  }

  if (!schema.ok) {
    return schema;
  }

  const jsonSchema = schema.value.json_schema;
  const hasChildren = Object.keys(jsonSchema.properties ?? {}).some((key) => {
    return getFormFieldKind(key, jsonSchema) === 'children';
  });

  const children = (fragment.children ?? []).map(toCmsChildRecord);

  return {
    ok: true,
    value: {
      children,
      draft: draft.value,
      fragment: record.value,
      hasChildren,
      previewChildren: toPreviewChildren(fragment.tree ?? [], children),
      schema: schema.value,
    },
  };
};

/**
 * @description The edited fragment as the one-root tree the preview renders: its stored
 * properties (the preview merges the draft over them, for this fragment only) and its children,
 * each with its own subtree, so a container inside a container previews its grandchildren.
 */
export const toCmsPreviewFragments = (
  records: CmsFragmentEditorRecords,
): readonly CmsFragment[] => {
  const { draft, fragment, previewChildren } = records;

  return [
    {
      children: previewChildren,
      properties: draft,
      typename: fragment.typename,
      uuid: fragment.uuid,
    },
  ];
};

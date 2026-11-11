import type { CmsJsonSchema } from '../types/cms-json-schema';
import { getSchemaRef } from './schema-property';

/**
 * @description Which form field edits a property.
 * @public
 */
export type CmsFormFieldKind =
  | 'anyOf'
  | 'array'
  | 'boolean'
  | 'children'
  | 'className'
  | 'link'
  | 'none'
  | 'number'
  | 'object'
  | 'select'
  | 'string'
  | 'wysiwyg';

const KIND_BY_TYPE: Readonly<Record<string, CmsFormFieldKind>> = {
  array: 'array',
  boolean: 'boolean',
  children: 'children',
  className: 'className',
  color: 'string',
  image: 'string',
  integer: 'number',
  json: 'wysiwyg',
  link: 'link',
  null: 'none',
  number: 'number',
  object: 'object',
  string: 'string',
  wysiwyg: 'wysiwyg',
};

/**
 * @description The field kind for one property of an object schema: `select` when it lists an
 * `enum`, `anyOf` when it has branches, otherwise by its `type` (following a local `$ref`).
 * `none` for a missing property or a type no field edits.
 * @public
 */
export const getFormFieldKind = (
  key: string,
  schema: CmsJsonSchema,
): CmsFormFieldKind => {
  const property = schema.properties?.[key];

  if (property === undefined) return 'none';
  if (property.enum !== undefined) return 'select';
  if (property.anyOf !== undefined) return 'anyOf';

  const { $ref: ref } = property;
  const resolved = ref === undefined ? property : getSchemaRef(ref, schema);
  const type = resolved?.type;

  return type === undefined ? 'none' : (KIND_BY_TYPE[type] ?? 'none');
};

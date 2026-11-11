import type { CmsJsonSchema } from '../types/cms-json-schema';

/**
 * @description The outcome of looking a property up by name: found, or missing from the schema.
 * @public
 */
export type CmsSchemaPropertyResult =
  | {
      readonly key: string;
      readonly kind: 'found';
      readonly property: CmsJsonSchema;
    }
  | { readonly key: string; readonly kind: 'missing' };

const DEFINITIONS_PREFIX = '#/definitions/';

/**
 * @description Looks up one property of an object schema. Upstream threw on a missing key; a
 * missing property is an expected answer, so it is returned instead.
 * @public
 */
export const getSchemaProperty = (
  key: string,
  schema: CmsJsonSchema,
): CmsSchemaPropertyResult => {
  const property = schema.properties?.[key];

  if (property === undefined) {
    return { key, kind: 'missing' };
  }

  return { key, kind: 'found', property };
};

/**
 * @description Resolves a local `$ref` (`#/definitions/<name>`) against the schema's definitions.
 * `undefined` for an unknown name or a ref that does not point into `definitions`.
 * @public
 */
export const getSchemaRef = (
  ref: string,
  schema: CmsJsonSchema,
): CmsJsonSchema | undefined => {
  if (!ref.startsWith(DEFINITIONS_PREFIX)) {
    return undefined;
  }

  return schema.definitions?.[ref.slice(DEFINITIONS_PREFIX.length)];
};

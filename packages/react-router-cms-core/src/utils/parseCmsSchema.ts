import type { CmsJsonSchema, CmsParsedSchema } from '../types/cms-json-schema';
import type { CmsSchema } from '../types/cms-records';

const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * @description Whether a stored value is shaped like a {@link CmsJsonSchema}: an object whose
 * `properties` and `definitions`, when present, are objects too. Every other keyword is optional.
 * @public
 */
export const isCmsJsonSchema = (value: unknown): value is CmsJsonSchema => {
  if (!isRecord(value)) {
    return false;
  }

  const { definitions, properties } = value;
  const isDefinitionsValid = definitions === undefined || isRecord(definitions);
  const isPropertiesValid = properties === undefined || isRecord(properties);

  return isDefinitionsValid && isPropertiesValid;
};

/**
 * @description Narrows a stored {@link CmsSchema} row to a {@link CmsParsedSchema}, or `undefined`
 * when its `json_schema` is not a JSON schema object.
 * @public
 */
export const parseCmsSchema = (
  schema: CmsSchema,
): CmsParsedSchema | undefined => {
  const jsonSchema = schema.json_schema;

  if (!isCmsJsonSchema(jsonSchema)) {
    return undefined;
  }

  return { ...schema, json_schema: jsonSchema };
};

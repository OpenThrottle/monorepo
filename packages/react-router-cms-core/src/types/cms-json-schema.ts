import type { JSONSchema7, JSONSchema7TypeName } from 'json-schema';

import type { CmsSchema } from './cms-records';

/**
 * @description JSON Schema `type` values plus the CMS's own field types. Upstream listed both
 * `classname` and `className`; only `className` is kept.
 * @public
 */
export type CmsSchemaInstanceType =
  | 'children'
  | 'className'
  | 'color'
  | 'image'
  | 'json'
  | 'link'
  | 'wysiwyg'
  | JSONSchema7TypeName;

/**
 * @description JSON Schema draft 7 widened to accept {@link CmsSchemaInstanceType}. Its members stay
 * optional because JSON Schema keywords are optional by definition.
 * @public
 */
export interface CmsJsonSchema<TType = CmsSchemaInstanceType> extends Omit<
  JSONSchema7,
  'definitions' | 'properties' | 'type'
> {
  readonly definitions?: Readonly<Record<string, CmsJsonSchema>>;
  readonly properties?: Readonly<Record<string, CmsJsonSchema>>;
  readonly type?: TType;
}

/**
 * @description A {@link CmsSchema} whose `json_schema` has been parsed into a {@link CmsJsonSchema}.
 * @public
 */
export interface CmsParsedSchema<TType = CmsSchemaInstanceType> extends Omit<
  CmsSchema,
  'json_schema'
> {
  readonly json_schema: CmsJsonSchema<TType>;
}

/**
 * @description Props every CMS form field receives.
 * @public
 */
export interface CmsFormBaseProps<TType = CmsSchemaInstanceType> {
  readonly className: string | undefined;
  readonly disabled: boolean;
  readonly label: string;
  readonly parent: boolean;
  readonly schema: CmsParsedSchema<TType>;
}

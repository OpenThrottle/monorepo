import type { JSONSchema7, JSONSchema7TypeName } from 'json-schema';

import type { CmsSchema } from './cms-records';

/**
 * @description The CMS's own field widgets. A generated block schema carries one in the custom
 * `x-cms-widget` keyword next to a standard `type` (`scripts/generate-cms-schemas.ts`, from a
 * prop's `@cmsWidget` tag), so the schema stays valid JSON Schema.
 * @public
 */
export type CmsSchemaWidget =
  'children' | 'className' | 'color' | 'image' | 'json' | 'link' | 'wysiwyg';

/**
 * @description JSON Schema `type` values plus the CMS's widgets. A widget in `type` is the legacy
 * RocketCMS shape — not valid JSON Schema — still mapped so old stored rows render; new schemas put
 * it in `x-cms-widget`. Upstream listed both `classname` and `className`; only `className` is kept.
 * @public
 */
export type CmsSchemaInstanceType = CmsSchemaWidget | JSONSchema7TypeName;

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
  /**
   * @description A widget name here is the legacy RocketCMS shape, kept readable for old rows; new
   * schemas use a standard type plus `x-cms-widget`.
   */
  readonly type?: TType;
  readonly 'x-cms-widget'?: CmsSchemaWidget;
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
  readonly hideLabel: boolean;
  readonly name: string;
  readonly schema: CmsParsedSchema<TType>;
}

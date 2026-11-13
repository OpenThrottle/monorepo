/**
 * @description One reason a value failed its JSON Schema, in Ajv's terms.
 * @public
 */
export interface CmsSchemaIssue {
  /** JSON Pointer to the failing value, e.g. `/size`; empty for the root. */
  readonly instancePath: string;
  readonly message: string;
}

/**
 * @description Outcome of validating fragment properties against a schema.
 * @public
 */
export type CmsSchemaValidationResult =
  | { readonly issues: readonly CmsSchemaIssue[]; readonly ok: false }
  | { readonly ok: true };

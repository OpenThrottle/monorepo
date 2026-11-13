import { Injectable } from '@nestjs/common';
import type { ValidateFunction } from 'ajv';
import { Ajv } from 'ajv';

import type {
  CmsSchemaIssue,
  CmsSchemaValidationResult,
} from './cms-schema-validation.types.ts';

/**
 * @description The one server-side validator for cms fragment properties (react-router-cms-core
 * deliberately ships none). Strict Ajv that meta-validates every schema, knows the
 * `x-cms-widget` keyword the block schemas carry, and never coerces types. Compiled validators
 * are cached per schema row, since a schema version never changes once written.
 * @public
 */
@Injectable()
export class CmsSchemaValidationService {
  private readonly ajv: Ajv;

  private readonly compiled = new Map<string, ValidateFunction>();

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: true, validateSchema: true });
    this.ajv.addKeyword({ keyword: 'x-cms-widget', schemaType: 'string' });
  }

  /**
   * @description Validates `properties` against the schema stored as `schemaUuid`.
   */
  validate(
    schemaUuid: string,
    jsonSchema: Readonly<Record<string, unknown>>,
    properties: Readonly<Record<string, unknown>>,
  ): CmsSchemaValidationResult {
    const validator = this.compile(schemaUuid, jsonSchema);

    if (!validator.ok) {
      return validator;
    }

    if (validator.validate(properties)) {
      return { ok: true };
    }

    const issues: CmsSchemaIssue[] = (validator.validate.errors ?? []).map(
      (error) => {
        return {
          instancePath: error.instancePath,
          message: error.message ?? error.keyword,
        };
      },
    );

    return { issues, ok: false };
  }

  /**
   * @description Whether `jsonSchema` is a JSON Schema this validator accepts (strict, with
   * `x-cms-widget`). Used to check a library component's props schema before storing it.
   */
  check(
    jsonSchema: Readonly<Record<string, unknown>>,
  ): CmsSchemaValidationResult {
    try {
      this.ajv.compile(jsonSchema);

      return { ok: true };
    } catch (error) {
      return {
        issues: [
          {
            instancePath: '',
            message: error instanceof Error ? error.message : String(error),
          },
        ],
        ok: false,
      };
    }
  }

  /**
   * @description The schema's top-level `default`s, which a new fragment starts from.
   */
  getDefaults(
    jsonSchema: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const properties: unknown = jsonSchema.properties;

    if (typeof properties !== 'object' || properties === null) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(properties).flatMap(([key, definition]) => {
        const isObject = typeof definition === 'object' && definition !== null;
        const hasDefault = isObject && 'default' in definition;

        return hasDefault ? [[key, Reflect.get(definition, 'default')]] : [];
      }),
    );
  }

  private compile(
    schemaUuid: string,
    jsonSchema: Readonly<Record<string, unknown>>,
  ):
    | { readonly issues: readonly CmsSchemaIssue[]; readonly ok: false }
    | { readonly ok: true; readonly validate: ValidateFunction } {
    const cached = this.compiled.get(schemaUuid);

    if (cached) {
      return { ok: true, validate: cached };
    }

    try {
      const validate = this.ajv.compile(jsonSchema);

      this.compiled.set(schemaUuid, validate);

      return { ok: true, validate };
    } catch (error) {
      return {
        issues: [
          {
            instancePath: '',
            message: `Stored schema ${schemaUuid} is not a valid JSON Schema: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        ok: false,
      };
    }
  }
}

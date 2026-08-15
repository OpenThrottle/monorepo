/**
 * @description Parse a route action's `FormData` into typed GraphQL variables
 * using a generated Zod schema, replacing the hand-rolled `formData.get` +
 * `typeof === 'string'` + trim + empty-check boilerplate duplicated across
 * feature actions.
 *
 * Pass a generated `*InputSchema()` (or any composed `z.object`) — the codegen
 * emits `.min(1)` for required strings (see `@openthrottle/graphql-codegen`
 * `notAllowEmptyString`), so empty required fields fail here instead of needing
 * a per-field guard. Form-only keys (e.g. the `intent` dispatch field) are
 * dropped via the `allow` list; any other key not on the schema fails strict.
 */
import { z } from 'zod/v3';

/** Form-only keys stripped from every submission unless a caller overrides. */
const DEFAULT_ALLOWED_EXTRAS: ReadonlyArray<string> = ['intent'];

/** @description Options for {@link parseFormData}. @public */
export interface ParseFormDataOptions {
  /**
   * Form-only field names to drop before validation (dispatch markers, CSRF
   * fields, …). Defaults to `['intent']`. Any submitted key that is neither on
   * the schema nor in this list fails strict validation.
   */
  readonly allow?: ReadonlyArray<string>;
  /**
   * Field names whose repeated values collect into an array (via `getAll`).
   * Empty entries are dropped; omit for the common single-value case.
   */
  readonly lists?: ReadonlyArray<string>;
  /**
   * Reject unknown keys (`.strict()`) when the schema is a `ZodObject`.
   * Defaults to `true` so a stray form field is a loud error, not silently
   * stripped. Disable only for schemas that intentionally accept passthrough.
   */
  readonly strict?: boolean;
}

/** @description Failure result from {@link parseFormData}. @public */
export interface FormDataParseFailure {
  /** Concise single-line summary (field errors joined) for an action result. */
  readonly error: string;
  /** First Zod message per field path (dot-joined) for field-level display. */
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly success: false;
}

/** @description Success result from {@link parseFormData}. @public */
export interface FormDataParseSuccess<T> {
  readonly data: T;
  readonly success: true;
}

/** @description Discriminated result of {@link parseFormData}. @public */
export type FormDataParseResult<T> =
  FormDataParseFailure | FormDataParseSuccess<T>;

/** Trim a submitted value; non-strings (File) and empty strings become null. */
const normalizeScalar = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Narrow an `unknown` to a plain object so nested assignment needs no cast. */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * Assign `value` at a dot/bracket path (`input.tag` or `input[tag]`) into
 * `target`, creating intermediate objects. A flat key (no separator) is a
 * plain top-level assignment.
 */
const assignPath = (
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void => {
  const segments = key
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment !== '');

  let cursor = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index] ?? '';
    const next = cursor[segment];
    if (isRecord(next)) {
      cursor = next;
    } else {
      const created: Record<string, unknown> = {};
      cursor[segment] = created;
      cursor = created;
    }
  }

  const leaf = segments[segments.length - 1];
  if (leaf !== undefined) {
    cursor[leaf] = value;
  }
};

/**
 * @description Convert `formData` to a plain object and `safeParse` it against
 * `schema`, returning either the typed `data` or a concise, field-mapped error
 * — ready to hand straight to a route action result and, on success, to
 * `executeGraphqlWithAuth`.
 *
 * Behavior: strings are trimmed; empty strings are omitted (so a blank required
 * field surfaces the schema's "required" error rather than passing as `''`);
 * `allow`-listed keys are dropped; `lists` keys collect repeated values;
 * dot/bracket keys (`input.tag`) build nested objects so both flat
 * (`{ tag }`) and wrapped (`{ input: { tag } }`) variable shapes are
 * expressible. Unknown keys fail strict by default.
 *
 * @public
 */
export const parseFormData = <Schema extends z.ZodTypeAny>(
  formData: FormData,
  schema: Schema,
  options?: ParseFormDataOptions,
): FormDataParseResult<z.infer<Schema>> => {
  const allow = new Set(options?.allow ?? DEFAULT_ALLOWED_EXTRAS);
  const lists = new Set(options?.lists ?? []);
  const strict = options?.strict ?? true;

  const raw: Record<string, unknown> = {};
  const seen = new Set<string>();

  for (const key of formData.keys()) {
    if (allow.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);

    if (lists.has(key)) {
      const values = formData
        .getAll(key)
        .map(normalizeScalar)
        .filter((value): value is string => value !== null);
      assignPath(raw, key, values);
      continue;
    }

    const value = normalizeScalar(formData.get(key));
    if (value !== null) {
      assignPath(raw, key, value);
    }
  }

  // Enforce strictness ourselves (rather than `schema.strict()`) so the parse
  // stays typed against the caller's schema and `result.data` is `z.infer`
  // without a cast. Generated `z.object` schemas strip unknown keys silently;
  // this turns a stray form field into a loud error.
  if (strict && schema instanceof z.ZodObject) {
    const known = new Set(Object.keys(schema.shape));
    const unknownKeys = Object.keys(raw).filter((key) => !known.has(key));
    if (unknownKeys.length > 0) {
      const fieldErrors = Object.fromEntries(
        unknownKeys.map((key) => [key, `Unrecognized field "${key}".`]),
      );
      return {
        error: Object.values(fieldErrors).join('; '),
        fieldErrors,
        success: false,
      };
    }
  }

  const result = schema.safeParse(raw);
  if (result.success) {
    return { data: result.data, success: true };
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_';
    if (fieldErrors[path] === undefined) {
      fieldErrors[path] = issue.message;
    }
  }

  return {
    error: Object.values(fieldErrors).join('; '),
    fieldErrors,
    success: false,
  };
};

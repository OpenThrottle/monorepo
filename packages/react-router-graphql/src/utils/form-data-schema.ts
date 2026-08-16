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
 *
 * Error messages are humanized centrally via a Zod `errorMap` ({@link
 * zodErrorMap}): a missing/blank required field becomes "{Label} is required.",
 * a bad enum "{Label} must be one of: …", where `{Label}` is the field path
 * humanized to sentence case ({@link humanizeFieldLabel}). So actions can
 * surface `parsed.error` / `parsed.fieldErrors` directly instead of hard-coding
 * per-field copy. Override the copy per call with `options.labels` (swap the
 * label) or `options.messages` (replace the whole message), keyed by dot-joined
 * path. A schema-supplied message (`.min(1, 'msg')`, `.refine(fn, 'msg')`) is
 * never overridden. Direct `safeParse` callers get the same copy via the
 * exported {@link zodErrorMap} / {@link formatZodError}.
 */
import { z } from 'zod/v3';

/** Form-only keys stripped from every submission unless a caller overrides. */
const DEFAULT_ALLOWED_EXTRAS: ReadonlyArray<string> = ['intent'];

/**
 * @description Options for {@link parseFormData}. Extends {@link
 * ZodMessageOptions} so a caller can pass `labels` / `messages` to override the
 * humanized default copy per field path (e.g. `{ labels: { startIso: 'start
 * time' } }`). @public
 */
export interface ParseFormDataOptions extends ZodMessageOptions {
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

/** @description Per-call message overrides for the centralized Zod error map. @public */
export interface ZodMessageOptions {
  /**
   * Dot-joined field path → display label, swapped into the humanized default
   * message template (e.g. `{ 'input.startIso': 'start time' }` yields
   * "start time is required."). The default humanizer applies to any path not
   * listed here.
   */
  readonly labels?: Readonly<Record<string, string>>;
  /**
   * Dot-joined field path → complete replacement message. Wins over `labels`
   * and the default templates for that path, for domain copy the templates
   * can't express.
   */
  readonly messages?: Readonly<Record<string, string>>;
}

/**
 * @description Humanize a field path into a display label: takes the last path
 * segment and converts camelCase / snake_case / kebab-case to sentence case
 * (first word capitalized). `startIso` → "Start iso", `project_id` →
 * "Project id", `tag` → "Tag". Accepts either a dot-joined string or a Zod
 * `issue.path` array. @public
 */
export const humanizeFieldLabel = (
  path: string | ReadonlyArray<string | number>,
): string => {
  const segments = (
    typeof path === 'string' ? path.split('.') : path.map(String)
  ).filter((segment) => segment !== '');
  // Prefer the last *named* segment so an array-element path (`tags.0`) labels
  // as "Tags", not "0".
  const named = segments.filter((segment) => !/^\d+$/.test(segment));
  const chosen = named.length > 0 ? named : segments;
  const last = String(chosen[chosen.length - 1] ?? '');
  const words = last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  if (words === '') {
    return last;
  }
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Compute the humanized override message for a single Zod issue, or `undefined`
 * to fall through to Zod's default. Shared by {@link createZodErrorMap} (at
 * parse time) and {@link formatZodError} (post-parse aggregation) so both
 * produce identical copy.
 */
const humanizeIssue = (
  issue: z.ZodIssueOptionalMessage,
  options?: ZodMessageOptions,
): string | undefined => {
  const dotted = issue.path.join('.');
  const fullOverride = options?.messages?.[dotted];
  if (fullOverride !== undefined) {
    return fullOverride;
  }
  const label = options?.labels?.[dotted] ?? humanizeFieldLabel(issue.path);

  if (issue.code === z.ZodIssueCode.invalid_type) {
    return issue.received === 'undefined' ? `${label} is required.` : undefined;
  }
  if (issue.code === z.ZodIssueCode.too_small && issue.type === 'string') {
    const minimum = Number(issue.minimum);
    return minimum <= 1
      ? `${label} is required.`
      : `${label} must be at least ${minimum} characters.`;
  }
  if (issue.code === z.ZodIssueCode.invalid_enum_value) {
    return `${label} must be one of: ${issue.options.join(', ')}.`;
  }
  return undefined;
};

/**
 * @description Build a Zod v3 `errorMap` that humanizes the default messages
 * `parseFormData` produces — missing/undefined required fields and empty
 * `.min(1)` strings → "{Label} is required.", short strings → length-aware,
 * bad enum values → "{Label} must be one of: …" — falling through to
 * `ctx.defaultError` for everything else. Optional per-call `labels`/`messages`
 * override the copy per field path.
 *
 * A schema-supplied message (`.min(1, 'msg')`, `.refine(fn, 'msg')`) is never
 * touched: Zod does not invoke a parse-level error map for an issue that
 * already carries an explicit message, so this map only ever fills defaults.
 *
 * @public
 */
export const createZodErrorMap = (
  options?: ZodMessageOptions,
): z.ZodErrorMap => {
  return (issue, ctx) => {
    return { message: humanizeIssue(issue, options) ?? ctx.defaultError };
  };
};

/**
 * @description Ready-to-use centralized Zod v3 error map with the default
 * humanization and no overrides — pass to `schema.safeParse(data, { errorMap:
 * zodErrorMap })` for identical messaging outside `parseFormData` (MCP tools,
 * loaders). Use {@link createZodErrorMap} when you need per-call
 * `labels`/`messages`. @public
 */
export const zodErrorMap: z.ZodErrorMap = createZodErrorMap();

/**
 * @description Aggregate a `ZodError` into the {@link FormDataParseFailure}
 * shape (`{ error, fieldErrors, success: false }`) with the same humanized
 * messages `parseFormData` surfaces — for direct `safeParse` callers that want
 * consistent copy. Applies the humanizer to each issue (first message per
 * dot-joined path wins).
 *
 * Precedence note: a raw `ZodError` no longer distinguishes an author-supplied
 * message from a Zod default, so for the handled codes this remaps
 * unconditionally. To preserve custom `.min(1, 'msg')` / `.refine` copy, parse
 * with `{ errorMap: zodErrorMap }` (or via `parseFormData`) instead of remapping
 * a raw error — generated schemas carry no author messages, so remapping is
 * exactly right for them.
 *
 * @public
 */
export const formatZodError = (
  error: z.ZodError,
  options?: ZodMessageOptions,
): FormDataParseFailure => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_';
    if (fieldErrors[path] === undefined) {
      fieldErrors[path] = humanizeIssue(issue, options) ?? issue.message;
    }
  }
  return {
    error: Object.values(fieldErrors).join('; '),
    fieldErrors,
    success: false,
  };
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
        unknownKeys.map((key) => [
          key,
          options?.messages?.[key] ??
            `Unrecognized field "${options?.labels?.[key] ?? humanizeFieldLabel(key)}".`,
        ]),
      );
      return {
        error: Object.values(fieldErrors).join('; '),
        fieldErrors,
        success: false,
      };
    }
  }

  // Parse with the centralized error map so `issue.message` is already the
  // humanized (or author-supplied — the map never overrides those) copy; then
  // aggregate directly rather than re-running the map (which, on a raw error,
  // can't tell an author message from a default and would clobber the former).
  const errorMap =
    options?.labels === undefined && options?.messages === undefined
      ? zodErrorMap
      : createZodErrorMap({
          labels: options.labels,
          messages: options.messages,
        });
  const result = schema.safeParse(raw, { errorMap });
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

/** Form string values (case-insensitive) that coerce to `true`. */
const TRUE_TOKENS: ReadonlySet<string> = new Set(['1', 'on', 'true', 'yes']);
/** Form string values (case-insensitive) that coerce to `false`. */
const FALSE_TOKENS: ReadonlySet<string> = new Set(['0', 'false', 'no', 'off']);

/**
 * @description Wrap a boolean schema so a form's string value coerces to a real
 * boolean before validation: `'true'`/`'on'`/`'1'`/`'yes'` → `true`,
 * `'false'`/`'off'`/`'0'`/`'no'` → `false` (case-insensitive). A blank or absent
 * value becomes `undefined`, so the wrapped schema's `.default()` / `.nullish()`
 * decides the fallback (an unchecked HTML checkbox submits nothing). Non-string
 * values and unrecognized strings pass through untouched for the schema to
 * accept or reject.
 *
 * Use inside `.extend()` on a generated `*InputSchema()` for checkbox/confirm
 * fields (`confirm`, `enabled`, `writeToFileSystem`) instead of comparing
 * `formData.get(...) === 'true'` at the call site.
 *
 * @public
 */
export const coerceBoolean = <Schema extends z.ZodTypeAny>(
  schema: Schema,
): z.ZodEffects<Schema, z.infer<Schema>, unknown> => {
  return z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === '') {
      return undefined;
    }
    if (TRUE_TOKENS.has(normalized)) {
      return true;
    }
    if (FALSE_TOKENS.has(normalized)) {
      return false;
    }
    return value;
  }, schema);
};

/**
 * @description Wrap a number schema so a numeric form string coerces to a number
 * before validation (e.g. `EnqueuePlanRunInput.priority`). A blank or absent
 * value becomes `undefined` (the wrapped schema decides the fallback); a
 * non-numeric string passes through so the schema rejects it rather than
 * silently sending `NaN`.
 *
 * @public
 */
export const coerceNumber = <Schema extends z.ZodTypeAny>(
  schema: Schema,
): z.ZodEffects<Schema, z.infer<Schema>, unknown> => {
  return z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }, schema);
};

/**
 * @description Wrap a schema so a JSON form string is `JSON.parse`d before
 * validation, then fed to the wrapped (typically nested, generated) schema —
 * for inputs whose value is an object encoded as JSON in a hidden field
 * (`ralphTuning`, a rollout `variations` blob). A blank or absent value becomes
 * `undefined`; malformed JSON passes the raw string through so the wrapped
 * schema rejects it.
 *
 * For fields that stay a JSON **string** on the GraphQL wire (`runConfigJson`,
 * `jobRunHooksJson`), do NOT use this — keep the generated `z.string()` and, if
 * you want an early validity check, add `.refine(isJsonString, 'Must be valid
 * JSON.')`.
 *
 * @public
 */
export const coerceJson = <Schema extends z.ZodTypeAny>(
  schema: Schema,
): z.ZodEffects<Schema, z.infer<Schema>, unknown> => {
  return z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return parsed;
    } catch {
      return value;
    }
  }, schema);
};

/**
 * @description Whether `value` parses as JSON — a `.refine` predicate for
 * string-on-wire JSON fields that must stay strings but should be rejected early
 * when malformed. @public
 */
export const isJsonString = (value: string): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

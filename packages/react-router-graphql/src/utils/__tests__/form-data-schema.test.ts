import { describe, expect, it } from 'vitest';
import { z } from 'zod/v3';
import {
  coerceBoolean,
  coerceJson,
  coerceNumber,
  formatZodError,
  humanizeFieldLabel,
  isJsonString,
  parseFormData,
  zodErrorMap,
} from '../form-data-schema';

/** Build a FormData from entries (arrays expand to repeated keys). */
const form = (entries: Record<string, string | ReadonlyArray<string>>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      data.append(key, item);
    }
  }
  return data;
};

/** Mirrors a generated `*InputSchema()` for a required-string input. */
const TagSchema = z.object({ tag: z.string().min(1) });

describe('parseFormData', () => {
  it('trims scalars and drops the intent dispatch key', () => {
    const result = parseFormData(
      form({ intent: 'addTag', tag: '  qa  ' }),
      TagSchema,
    );

    expect(result).toStrictEqual({ data: { tag: 'qa' }, success: true });
  });

  it('treats an empty required field as missing so the schema rejects it', () => {
    const result = parseFormData(
      form({ intent: 'addTag', tag: '   ' }),
      TagSchema,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.tag).toBeDefined();
      expect(result.error).toContain(result.fieldErrors.tag);
    }
  });

  it('omits blank optional fields rather than sending empty strings', () => {
    const schema = z.object({
      note: z.string().optional(),
      tag: z.string().min(1),
    });

    const result = parseFormData(form({ note: '', tag: 'qa' }), schema);

    expect(result).toStrictEqual({ data: { tag: 'qa' }, success: true });
  });

  it('fails strict on an unknown key not in the allow list', () => {
    const result = parseFormData(form({ rogue: 'x', tag: 'qa' }), TagSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toBe('');
    }
  });

  it('keeps an allow-listed extra out of the parsed data', () => {
    const result = parseFormData(
      form({ csrf: 'token', tag: 'qa' }),
      TagSchema,
      {
        allow: ['csrf', 'intent'],
      },
    );

    expect(result).toStrictEqual({ data: { tag: 'qa' }, success: true });
  });

  it('builds nested variables from dot/bracket keys', () => {
    const schema = z.object({ input: z.object({ tag: z.string().min(1) }) });

    const dot = parseFormData(form({ 'input.tag': 'qa' }), schema);
    const bracket = parseFormData(form({ 'input[tag]': 'qa' }), schema);

    expect(dot).toStrictEqual({
      data: { input: { tag: 'qa' } },
      success: true,
    });
    expect(bracket).toStrictEqual({
      data: { input: { tag: 'qa' } },
      success: true,
    });
  });

  it('collects repeated values for list fields, dropping blanks', () => {
    const schema = z.object({ tags: z.array(z.string().min(1)) });

    const result = parseFormData(form({ tags: ['a', '', 'b'] }), schema, {
      lists: ['tags'],
    });

    expect(result).toStrictEqual({ data: { tags: ['a', 'b'] }, success: true });
  });

  it('maps multiple issues to one message per field path', () => {
    const schema = z.object({ from: z.string().min(1), to: z.string().min(1) });

    const result = parseFormData(form({ from: '', to: '' }), schema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.fieldErrors).sort()).toStrictEqual([
        'from',
        'to',
      ]);
    }
  });

  it('coerces checkbox/confirm strings to booleans', () => {
    const schema = z.object({
      confirm: coerceBoolean(z.boolean()),
      enabled: coerceBoolean(z.boolean().default(false)),
    });

    const truthy = parseFormData(
      form({ confirm: 'true', enabled: 'on' }),
      schema,
    );
    expect(truthy).toStrictEqual({
      data: { confirm: true, enabled: true },
      success: true,
    });

    const falsy = parseFormData(form({ confirm: 'false' }), schema);
    expect(falsy).toStrictEqual({
      data: { confirm: false, enabled: false },
      success: true,
    });
  });

  it('coerces a numeric string to a number and rejects non-numeric input', () => {
    const schema = z.object({ priority: coerceNumber(z.number().int()) });

    expect(parseFormData(form({ priority: '5' }), schema)).toStrictEqual({
      data: { priority: 5 },
      success: true,
    });

    const bad = parseFormData(form({ priority: 'high' }), schema);
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.fieldErrors.priority).toBeDefined();
    }
  });

  it('parses a JSON blob field into a nested schema', () => {
    const schema = z.object({
      tuning: coerceJson(z.object({ retries: z.number(), skill: z.string() })),
    });

    const result = parseFormData(
      form({ tuning: '{"retries":3,"skill":"deploy"}' }),
      schema,
    );

    expect(result).toStrictEqual({
      data: { tuning: { retries: 3, skill: 'deploy' } },
      success: true,
    });
  });

  it('rejects malformed JSON via the wrapped schema', () => {
    const schema = z.object({
      tuning: coerceJson(z.object({ a: z.string() })),
    });

    const result = parseFormData(form({ tuning: 'not-json' }), schema);
    expect(result.success).toBe(false);
  });

  it('validates a JSON string field in place with isJsonString', () => {
    const schema = z.object({
      runConfigJson: z.string().refine(isJsonString, 'Must be valid JSON.'),
    });

    const ok = parseFormData(form({ runConfigJson: '{"a":1}' }), schema);
    expect(ok).toStrictEqual({
      data: { runConfigJson: '{"a":1}' },
      success: true,
    });

    const bad = parseFormData(form({ runConfigJson: '{bad' }), schema);
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.fieldErrors.runConfigJson).toBe('Must be valid JSON.');
    }
  });

  it('leaves a File value out of the parsed data (no upload regression)', () => {
    const schema = z.object({
      name: z.string().min(1),
      upload: z.instanceof(File).optional(),
    });

    const data = new FormData();
    data.append('name', 'archive');
    data.append('upload', new File(['content'], 'a.zip'));

    const result = parseFormData(data, schema);
    expect(result).toStrictEqual({ data: { name: 'archive' }, success: true });
  });

  it('humanizes a missing required field to "{Label} is required."', () => {
    const result = parseFormData(form({}), TagSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.tag).toBe('Tag is required.');
    }
  });

  it('humanizes a blank required field the same as a missing one', () => {
    const result = parseFormData(form({ tag: '   ' }), TagSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.tag).toBe('Tag is required.');
    }
  });

  it('preserves a schema-supplied length message untouched', () => {
    // A present-but-short value reaches `.min(5)` as `too_small` (an empty
    // value would be dropped to "missing" before the schema sees it), so the
    // author message is what the map must leave alone.
    const schema = z.object({ tag: z.string().min(5, 'Bespoke copy.') });

    const result = parseFormData(form({ tag: 'ab' }), schema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.tag).toBe('Bespoke copy.');
    }
  });

  it('preserves a schema-supplied .refine message untouched', () => {
    const schema = z.object({
      tag: z
        .string()
        .min(1)
        .refine((value) => value === 'ok', 'Must be ok.'),
    });

    const result = parseFormData(form({ tag: 'nope' }), schema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.tag).toBe('Must be ok.');
    }
  });

  it('humanizes an invalid enum value with the allowed options', () => {
    const schema = z.object({ status: z.enum(['PENDING', 'DONE']) });

    const result = parseFormData(form({ status: 'nope' }), schema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.status).toBe(
        'Status must be one of: PENDING, DONE.',
      );
    }
  });

  it('humanizes a missing enum field as required', () => {
    const schema = z.object({ status: z.enum(['PENDING', 'DONE']) });

    const result = parseFormData(form({}), schema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.status).toBe('Status is required.');
    }
  });

  it('derives the label from the last segment of a nested path', () => {
    const schema = z.object({
      input: z.object({ startIso: z.string().min(1), tag: z.string().min(1) }),
    });

    // `input` is present (via the sibling), so the missing child surfaces at
    // the nested path rather than collapsing to a missing-parent error.
    const result = parseFormData(
      form({ 'input.startIso': '', 'input.tag': 'qa' }),
      schema,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors['input.startIso']).toBe(
        'Start iso is required.',
      );
    }
  });

  it('humanizes the unrecognized-key message', () => {
    const result = parseFormData(
      form({ projectId: 'x', tag: 'qa' }),
      TagSchema,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.projectId).toBe(
        'Unrecognized field "Project id".',
      );
    }
  });

  it('applies a per-call label override to the default template', () => {
    const schema = z.object({ startIso: z.string().min(1) });

    const result = parseFormData(form({}), schema, {
      labels: { startIso: 'start time' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.startIso).toBe('start time is required.');
    }
  });

  it('applies a per-call full-message override', () => {
    const schema = z.object({ startIso: z.string().min(1) });

    const result = parseFormData(form({}), schema, {
      messages: { startIso: 'Pick when the run should start.' },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.startIso).toBe(
        'Pick when the run should start.',
      );
    }
  });
});

describe('humanizeFieldLabel', () => {
  const cases: ReadonlyArray<
    readonly [string | ReadonlyArray<string | number>, string]
  > = [
    ['tag', 'Tag'],
    ['startIso', 'Start iso'],
    ['project_id', 'Project id'],
    ['queue-name', 'Queue name'],
    ['input.startIso', 'Start iso'],
    [['input', 'startIso'], 'Start iso'],
    [['tags', 0], 'Tags'],
  ];

  it.each(cases)('humanizes %j to %j', (input, expected) => {
    expect(humanizeFieldLabel(input)).toBe(expected);
  });
});

describe('zodErrorMap + formatZodError', () => {
  it('humanizes via a direct safeParse with zodErrorMap', () => {
    const schema = z.object({ tag: z.string().min(1) });

    const result = schema.safeParse({}, { errorMap: zodErrorMap });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Tag is required.');
    }
  });

  it('formats a raw ZodError into the failure shape with humanized copy', () => {
    const schema = z.object({
      status: z.enum(['A', 'B']),
      tag: z.string().min(1),
    });

    const parsed = schema.safeParse({ status: 'X' });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const formatted = formatZodError(parsed.error);

    expect(formatted.success).toBe(false);
    expect(formatted.fieldErrors).toStrictEqual({
      status: 'Status must be one of: A, B.',
      tag: 'Tag is required.',
    });
    expect(formatted.error).toContain('Tag is required.');
  });

  it('applies per-call label and full-message overrides', () => {
    const schema = z.object({
      endIso: z.string().min(1),
      startIso: z.string().min(1),
    });

    const parsed = schema.safeParse({});
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const formatted = formatZodError(parsed.error, {
      labels: { startIso: 'start time' },
      messages: { endIso: 'Pick an end date.' },
    });

    expect(formatted.fieldErrors).toStrictEqual({
      endIso: 'Pick an end date.',
      startIso: 'start time is required.',
    });
  });
});

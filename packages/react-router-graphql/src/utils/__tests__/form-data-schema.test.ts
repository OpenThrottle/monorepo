import { describe, expect, it } from 'vitest';
import { z } from 'zod/v3';
import { parseFormData } from '../form-data-schema';

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
});

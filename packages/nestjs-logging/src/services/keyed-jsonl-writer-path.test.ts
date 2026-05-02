import { describe, expect, it } from 'vitest';
import {
  buildKeyedJsonlRelativePath,
  KEYED_JSONL_MAX_SEGMENT_UTF16,
  keyedJsonlHash8,
  keyedJsonlPairHash8,
  sanitizeKeyedJsonlSegment,
} from './keyed-jsonl-writer-path';

describe('sanitizeKeyedJsonlSegment', () => {
  it('replaces path separators and control characters with underscores', () => {
    expect(sanitizeKeyedJsonlSegment('a/b\\c')).toBe('a_b_c');
    expect(sanitizeKeyedJsonlSegment('x\u0001y')).toBe('x_y');
  });

  it('replaces NUL with underscore', () => {
    expect(sanitizeKeyedJsonlSegment('a\0b')).toBe('a_b');
  });

  it('maps empty-after-trim to a single underscore', () => {
    expect(sanitizeKeyedJsonlSegment('...')).toBe('_');
    expect(sanitizeKeyedJsonlSegment('   ')).toBe('_');
  });

  it('disambiguates reserved Windows device names case-insensitively', () => {
    expect(sanitizeKeyedJsonlSegment('CON')).toBe('CON_');
    expect(sanitizeKeyedJsonlSegment('com1')).toBe('com1_');
    expect(sanitizeKeyedJsonlSegment('LPT9')).toBe('LPT9_');
  });

  it('appends hash suffix when segment exceeds max UTF-16 length', () => {
    const long = 'α'.repeat(KEYED_JSONL_MAX_SEGMENT_UTF16 + 5);
    const out = sanitizeKeyedJsonlSegment(long);
    const tilde = out.indexOf('~');

    expect(tilde).toBeGreaterThan(0);
    expect(out.slice(tilde + 1)).toHaveLength(8);
    expect(out).toContain(keyedJsonlHash8(long));
    expect(out.length).toBeLessThanOrEqual(KEYED_JSONL_MAX_SEGMENT_UTF16);
  });

  it('keeps BMP segments at or under the cap without a suffix', () => {
    const s = 'j'.repeat(KEYED_JSONL_MAX_SEGMENT_UTF16);

    expect(sanitizeKeyedJsonlSegment(s)).toBe(s);
  });
});

describe('buildKeyedJsonlRelativePath', () => {
  it('nests queue segment and job file with jsonl extension', () => {
    expect(
      buildKeyedJsonlRelativePath({
        extension: '.jsonl',
        jobId: 'job-1',
        queueName: 'reports',
      }),
    ).toBe('reports/job-1.jsonl');
  });

  it('uses .log extension for raw capture', () => {
    expect(
      buildKeyedJsonlRelativePath({
        extension: '.log',
        jobId: '42',
        queueName: 'tasks',
      }),
    ).toBe('tasks/42.log');
  });

  it('includes collision suffix on the job file when provided', () => {
    const h = keyedJsonlPairHash8('q', 'j');

    expect(
      buildKeyedJsonlRelativePath({
        collisionJobSuffix: h,
        extension: '.jsonl',
        jobId: 'j',
        queueName: 'q',
      }),
    ).toBe(`q/j~${h}.jsonl`);
  });
});

describe('keyedJsonlPairHash8', () => {
  it('is stable for the same queue and job', () => {
    expect(keyedJsonlPairHash8('a', 'b')).toBe(keyedJsonlPairHash8('a', 'b'));
    expect(keyedJsonlPairHash8('a', 'b')).not.toBe(
      keyedJsonlPairHash8('a', 'c'),
    );
  });
});

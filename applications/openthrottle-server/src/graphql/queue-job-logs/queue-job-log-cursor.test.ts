import { describe, expect, it } from 'vitest';
import {
  decodeQueueJobLogCursor,
  encodeQueueJobLogCursor,
} from './queue-job-log-cursor';

describe('queue-job-log cursor', () => {
  it('round-trips a line index', () => {
    for (const line of [0, 1, 42, 1_000_000]) {
      expect(decodeQueueJobLogCursor(encodeQueueJobLogCursor(line))).toBe(line);
    }
  });

  it('produces an opaque (non-plaintext) token', () => {
    const token = encodeQueueJobLogCursor(7);
    expect(token).not.toContain('7');
    expect(token).not.toMatch(/line/i);
  });

  it('returns undefined for a non-base64/garbage token', () => {
    expect(decodeQueueJobLogCursor('not a real cursor!!')).toBeUndefined();
  });

  it('returns undefined for a wrong-version payload', () => {
    const token = Buffer.from(
      JSON.stringify({ line: 5, v: 2 }),
      'utf8',
    ).toString('base64url');
    expect(decodeQueueJobLogCursor(token)).toBeUndefined();
  });

  it('returns undefined for a negative or non-integer line', () => {
    const negative = Buffer.from(
      JSON.stringify({ line: -1, v: 1 }),
      'utf8',
    ).toString('base64url');
    const fractional = Buffer.from(
      JSON.stringify({ line: 1.5, v: 1 }),
      'utf8',
    ).toString('base64url');

    expect(decodeQueueJobLogCursor(negative)).toBeUndefined();
    expect(decodeQueueJobLogCursor(fractional)).toBeUndefined();
  });

  it('returns undefined when the payload is not an object', () => {
    const token = Buffer.from(JSON.stringify(5), 'utf8').toString('base64url');
    expect(decodeQueueJobLogCursor(token)).toBeUndefined();
  });
});

import { describe, expect, test } from 'vitest';
import {
  formatChunkDay,
  formatChunkTime,
  formatChunkTimestamp,
  groupChunksByDay,
  toChunkDateTimeAttribute,
} from '../output-stream-chunks';
import type { OutputStreamChunk } from '../output-stream-chunks';

/** Local-midday timestamps keep the assertions timezone-agnostic. */
const chunkAt = (id: string, createdAt: unknown): OutputStreamChunk => ({
  content: `content ${id}`,
  createdAt,
  id,
  iteration: 1,
});

describe('output-stream-chunks Utils', () => {
  test('formats a compact local wall-clock time', () => {
    expect(formatChunkTime(new Date(2026, 7, 19, 13, 16, 45))).toBe('13:16:45');
  });

  test('keeps the full timestamp available for the header title', () => {
    expect(formatChunkTimestamp(new Date(2026, 7, 19, 13, 16, 45))).toBe(
      'Aug 19, 2026 at 1:16:45 PM',
    );
  });

  test('formats the day heading', () => {
    expect(formatChunkDay(new Date(2026, 7, 19, 13, 16, 45))).toBe(
      'Wed, Aug 19, 2026',
    );
  });

  test('returns null instead of "Invalid Date" for unusable values', () => {
    for (const value of [null, undefined, '', 'not-a-date', {}]) {
      expect(formatChunkTime(value)).toBeNull();
      expect(formatChunkTimestamp(value)).toBeNull();
      expect(formatChunkDay(value)).toBeNull();
      expect(toChunkDateTimeAttribute(value)).toBeNull();
    }
  });

  test('exposes an ISO dateTime attribute value', () => {
    expect(toChunkDateTimeAttribute('2026-08-19T20:16:45.000Z')).toBe(
      '2026-08-19T20:16:45.000Z',
    );
  });

  test('groups consecutive chunks that share a calendar day', () => {
    const groups = groupChunksByDay([
      chunkAt('a', new Date(2026, 7, 19, 9, 0, 0)),
      chunkAt('b', new Date(2026, 7, 19, 13, 16, 45)),
      chunkAt('c', new Date(2026, 7, 20, 8, 0, 0)),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.label).toBe('Wed, Aug 19, 2026');
    expect(groups[0]?.chunks.map((chunk) => chunk.id)).toStrictEqual([
      'a',
      'b',
    ]);
    expect(groups[1]?.label).toBe('Thu, Aug 20, 2026');
    expect(groups[1]?.chunks.map((chunk) => chunk.id)).toStrictEqual(['c']);
  });

  test('keeps chunks with unusable timestamps rather than dropping them', () => {
    const groups = groupChunksByDay([
      chunkAt('a', 'nope'),
      chunkAt('b', 'also-nope'),
      chunkAt('c', new Date(2026, 7, 19, 9, 0, 0)),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.label).toBeNull();
    expect(groups[0]?.chunks.map((chunk) => chunk.id)).toStrictEqual([
      'a',
      'b',
    ]);
    expect(groups[1]?.label).toBe('Wed, Aug 19, 2026');
  });

  test('returns no groups for an empty stream', () => {
    expect(groupChunksByDay([])).toStrictEqual([]);
  });
});

import { describe, expect, test } from 'vitest';

import type { NoteCardFragment } from '~/__generated__/graphql';

import { countNoteStats, toNoteTime } from '../notes-stats';

const NOW = Date.parse('2026-11-25T12:00:00.000Z');

const daysAgo = (days: number): string => {
  return new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
};

const makeNote = (
  overrides: Partial<NoteCardFragment> = {},
): NoteCardFragment => {
  return {
    __typename: 'NoteObject',
    author: 'visormatt',
    content: 'Body',
    createdAt: daysAgo(1),
    id: 'note-1',
    updatedAt: null,
    ...overrides,
  };
};

describe('toNoteTime', () => {
  test('parses an ISO string', () => {
    expect(toNoteTime('2026-11-25T12:00:00.000Z')).toBe(NOW);
  });

  test('accepts a Date', () => {
    expect(toNoteTime(new Date(NOW))).toBe(NOW);
  });

  test('returns undefined for null, numbers and garbage', () => {
    expect(toNoteTime(null)).toBeUndefined();
    expect(toNoteTime(NOW)).toBeUndefined();
    expect(toNoteTime('not a date')).toBeUndefined();
  });
});

describe('countNoteStats', () => {
  test('returns zeros for no notes', () => {
    expect(countNoteStats([], NOW)).toEqual({
      authorCount: 0,
      createdLast30Days: 0,
      total: 0,
      updatedLast7Days: 0,
    });
  });

  test('counts distinct trimmed authors and ignores blank ones', () => {
    const notes = [
      makeNote({ author: 'a', id: '1' }),
      makeNote({ author: ' a ', id: '2' }),
      makeNote({ author: 'b', id: '3' }),
      makeNote({ author: '   ', id: '4' }),
      makeNote({ author: null, id: '5' }),
    ];

    expect(countNoteStats(notes, NOW).authorCount).toBe(2);
  });

  test('counts notes created within 30 days', () => {
    const notes = [
      makeNote({ createdAt: daysAgo(2), id: '1' }),
      makeNote({ createdAt: daysAgo(30), id: '2' }),
      makeNote({ createdAt: daysAgo(31), id: '3' }),
    ];

    expect(countNoteStats(notes, NOW).createdLast30Days).toBe(2);
  });

  describe('updated within 7 days', () => {
    test('uses updatedAt when present', () => {
      const notes = [
        makeNote({ createdAt: daysAgo(40), id: '1', updatedAt: daysAgo(3) }),
        makeNote({ createdAt: daysAgo(3), id: '2', updatedAt: daysAgo(10) }),
      ];

      expect(countNoteStats(notes, NOW).updatedLast7Days).toBe(1);
    });

    test('falls back to createdAt when updatedAt is missing', () => {
      const notes = [
        makeNote({ createdAt: daysAgo(6), id: '1', updatedAt: null }),
        makeNote({ createdAt: daysAgo(8), id: '2', updatedAt: null }),
      ];

      expect(countNoteStats(notes, NOW).updatedLast7Days).toBe(1);
    });
  });

  test('total is the note count', () => {
    expect(countNoteStats([makeNote(), makeNote({ id: '2' })], NOW).total).toBe(
      2,
    );
  });
});

import { describe, expect, test } from 'vitest';
import type { NoteCardFragment } from '~/__generated__/graphql';
import { filterNotesBySearch } from '../filter-notes-by-search';

const note = (over: Partial<NoteCardFragment>): NoteCardFragment => ({
  author: null,
  content: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  id: 'n',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('filterNotesBySearch', () => {
  const notes = [
    note({ author: 'Alice', content: 'Deploy runbook', id: '1' }),
    note({ author: 'Bob', content: 'Grocery list', id: '2' }),
    note({ author: null, content: 'MEETING notes', id: '3' }),
  ];

  test('returns all notes when the query is blank/whitespace', () => {
    expect(filterNotesBySearch(notes, '')).toHaveLength(3);
    expect(filterNotesBySearch(notes, '   ')).toHaveLength(3);
  });

  test('matches content case-insensitively', () => {
    expect(filterNotesBySearch(notes, 'meeting').map((n) => n.id)).toEqual([
      '3',
    ]);
  });

  test('matches author case-insensitively', () => {
    expect(filterNotesBySearch(notes, 'alice').map((n) => n.id)).toEqual(['1']);
  });

  test('excludes notes matching neither content nor author', () => {
    expect(filterNotesBySearch(notes, 'zzz')).toEqual([]);
  });
});

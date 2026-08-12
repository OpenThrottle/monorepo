import { formatDate } from 'date-fns';
import { describe, expect, test } from 'vitest';
import { formatNoteDate, notePreviewLabel } from '../notes-table';

describe('notePreviewLabel', () => {
  test('returns the first non-empty line with heading markers stripped', () => {
    expect(notePreviewLabel('# Heading\nBody text')).toBe('Heading');
  });

  test('trims surrounding whitespace on the first line', () => {
    expect(notePreviewLabel('   Spaced out line   \nmore')).toBe(
      'Spaced out line',
    );
  });

  test('truncates a long first line to 80 characters with an ellipsis', () => {
    const longLine = 'a'.repeat(90);
    const result = notePreviewLabel(longLine);
    expect(result).toBe(`${'a'.repeat(80)}…`);
  });

  test('falls back to the trimmed full content when the first line is blank after stripping', () => {
    expect(notePreviewLabel('#\nSecond line body')).toBe('#\nSecond line body');
  });

  test('returns "Untitled note" when the content is entirely empty', () => {
    expect(notePreviewLabel('')).toBe('Untitled note');
    expect(notePreviewLabel('   ')).toBe('Untitled note');
  });

  test('truncates the fallback full content to 80 characters with an ellipsis', () => {
    const longContent = `#\n${'b'.repeat(90)}`;
    const result = notePreviewLabel(longContent);
    expect(result).toBe(`#\n${'b'.repeat(78)}…`);
  });
});

describe('formatNoteDate', () => {
  test('returns an em dash when the timestamp is null or undefined', () => {
    expect(formatNoteDate(null)).toBe('—');
    expect(formatNoteDate(undefined)).toBe('—');
  });

  test('formats a string ISO timestamp as MM/dd/yyyy', () => {
    const iso = '2026-03-15T00:00:00.000Z';
    expect(formatNoteDate(iso)).toBe(formatDate(new Date(iso), 'MM/dd/yyyy'));
  });

  test('formats a Date instance as MM/dd/yyyy', () => {
    const date = new Date('2026-01-05T00:00:00.000Z');
    expect(formatNoteDate(date)).toBe(formatDate(date, 'MM/dd/yyyy'));
  });

  test('returns an em dash when the value cannot be parsed as a valid date', () => {
    expect(formatNoteDate('not-a-date')).toBe('—');
  });
});

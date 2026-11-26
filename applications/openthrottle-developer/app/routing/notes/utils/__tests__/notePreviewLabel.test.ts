import { describe, expect, test } from 'vitest';

import { notePreviewLabel } from '../notePreviewLabel';

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

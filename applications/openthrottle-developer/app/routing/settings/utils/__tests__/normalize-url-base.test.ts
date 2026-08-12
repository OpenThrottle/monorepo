import { describe, expect, test } from 'vitest';
import { normalizeUrlBase } from '../normalize-url-base';

describe('normalizeUrlBase', () => {
  test('strips a single trailing slash', () => {
    expect(normalizeUrlBase('https://example.com/')).toBe(
      'https://example.com',
    );
  });

  test('leaves a URL without a trailing slash unchanged', () => {
    expect(normalizeUrlBase('https://example.com')).toBe('https://example.com');
  });

  test('only strips one trailing slash, leaving the rest intact', () => {
    expect(normalizeUrlBase('https://example.com//')).toBe(
      'https://example.com/',
    );
  });

  test('returns an empty string unchanged', () => {
    expect(normalizeUrlBase('')).toBe('');
  });
});

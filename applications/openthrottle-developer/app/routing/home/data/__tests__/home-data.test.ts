import { describe, expect, test } from 'vitest';
import { technologies } from '~/routing/home/data/technology';

describe('routing/home data', () => {
  test('technologies is an array of technology entries', () => {
    expect(Array.isArray(technologies)).toBe(true);
    for (const technology of technologies) {
      expect(typeof technology.image).toBe('string');
      expect(typeof technology.name).toBe('string');
      expect(typeof technology.url).toBe('string');
    }
  });
});

import { describe, expect, test } from 'vitest';
import { slugify } from '../slugify';

describe('slugify', () => {
  test('lowercases and hyphenates whitespace', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
  });

  test('collapses punctuation runs and trims edges', () => {
    expect(slugify('  What is OpenThrottle?  ')).toBe('what-is-openthrottle');
    expect(slugify('Run `pnpm` now')).toBe('run-pnpm-now');
  });

  test('strips leading/trailing emphasis so it matches rendered text', () => {
    expect(slugify('**Bold heading**')).toBe('bold-heading');
  });
});

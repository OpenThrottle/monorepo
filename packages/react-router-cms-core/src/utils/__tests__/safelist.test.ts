import { describe, expect, it } from 'vitest';

import {
  expandBracePattern,
  findUnsupportedClasses,
  getSafelistedClasses,
} from '../safelist';

describe('expandBracePattern', () => {
  it('returns a pattern without braces unchanged', () => {
    expect(expandBracePattern('rounded')).toStrictEqual(['rounded']);
  });

  it('expands sequential brace groups as a cross product', () => {
    expect(expandBracePattern('{px,py}-{1,2}')).toStrictEqual([
      'px-1',
      'px-2',
      'py-1',
      'py-2',
    ]);
  });

  it('keeps variant prefixes and fractions intact', () => {
    expect(expandBracePattern('{md,lg}:w-{1/2,full}')).toStrictEqual([
      'md:w-1/2',
      'md:w-full',
      'lg:w-1/2',
      'lg:w-full',
    ]);
  });
});

describe('getSafelistedClasses', () => {
  it('includes theme-token colors and their hover variants', () => {
    const classes = getSafelistedClasses();

    expect(classes.has('bg-primary')).toBe(true);
    expect(classes.has('hover:text-muted-foreground')).toBe(true);
  });

  it('includes the non-theme CMS groups', () => {
    const classes = getSafelistedClasses();

    for (const name of ['p-4', 'md:grid-cols-3', 'rounded-t-lg', 'mx-auto']) {
      expect(classes.has(name)).toBe(true);
    }
  });

  it('excludes off-scale steps and opacity modifiers', () => {
    const classes = getSafelistedClasses();

    expect(classes.has('p-5')).toBe(false);
    expect(classes.has('bg-primary/20')).toBe(false);
  });
});

describe('findUnsupportedClasses', () => {
  const safelisted = new Set(['p-4', 'flex']);

  it('returns nothing for an empty or fully supported value', () => {
    expect(findUnsupportedClasses('', safelisted)).toStrictEqual([]);
    expect(findUnsupportedClasses('  flex   p-4 ', safelisted)).toStrictEqual(
      [],
    );
  });

  it('returns unsupported classes once, in typed order', () => {
    expect(
      findUnsupportedClasses('p-5 flex bg-primary/20 p-5', safelisted),
    ).toStrictEqual(['p-5', 'bg-primary/20']);
  });
});

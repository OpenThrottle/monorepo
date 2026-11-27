import { describe, expect, test } from 'vitest';

import { fillTemplate } from '../template.ts';

describe('fillTemplate', () => {
  test('replaces every occurrence of each token', () => {
    expect(fillTemplate('{a}-{a}-{b}', { a: '1', b: '2' })).toBe('1-1-2');
  });

  test('leaves unknown tokens in place', () => {
    expect(fillTemplate('{a} {b}', { a: '1' })).toBe('1 {b}');
  });
});

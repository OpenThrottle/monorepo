import { describe, expect, test } from 'vitest';

import { fillTemplate } from '../fillTemplate';

describe('fillTemplate', () => {
  test('replaces every occurrence of each token', () => {
    expect(fillTemplate('{a}-{a}-{b}', { a: '1', b: '2' })).toBe('1-1-2');
  });
});

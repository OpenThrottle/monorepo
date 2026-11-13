import { describe, expect, it } from 'vitest';

import { formatJson } from '../formatJson';

describe('formatJson', () => {
  it('pretty-prints valid JSON', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it('returns invalid JSON unchanged', () => {
    expect(formatJson('{nope')).toBe('{nope');
  });
});

import { describe, expect, it } from 'vitest';

import { consensusLabel } from './consensus-label.utils.ts';

describe('consensusLabel', () => {
  it('returns null when there is no label', () => {
    expect(consensusLabel([])).toBeNull();
  });

  it('returns the verdict when every rater agrees', () => {
    expect(consensusLabel(['pass'])).toBe('pass');
    expect(consensusLabel(['fail', 'fail'])).toBe('fail');
  });

  it('returns null when the raters disagree', () => {
    expect(consensusLabel(['pass', 'fail'])).toBeNull();
  });
});

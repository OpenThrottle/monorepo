import { describe, expect, it } from 'vitest';

import { nullableNumberColumn } from './nullable-number-column.utils.ts';

describe('nullableNumberColumn', () => {
  const transformer = nullableNumberColumn();

  it('reads a numeric string back as a number', () => {
    expect(transformer.from('0.012500')).toBe(0.0125);
  });

  it('keeps NULL as null rather than zero', () => {
    expect(transformer.from(null)).toBeNull();
    expect(transformer.to(null)).toBeNull();
  });

  it('writes a number through unchanged', () => {
    expect(transformer.to(1.5)).toBe(1.5);
  });
});

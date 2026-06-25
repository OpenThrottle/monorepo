import { describe, expect, it } from 'vitest';
import { vectorTransformer } from './vector.transformer';

const VECTOR_DIM = 1536;

function makeVectorString(values: readonly number[]): string {
  return `[${values.join(',')}]`;
}

describe('vectorTransformer.from', () => {
  it('parses a well-formed 1536-dim vector string into numbers', () => {
    const values = Array.from({ length: VECTOR_DIM }, (_, i) => i * 0.001);
    const result = vectorTransformer.from(makeVectorString(values));

    expect(result).not.toBeNull();
    expect(result).toHaveLength(VECTOR_DIM);
    expect(result?.[0]).toBe(0);
    expect(result?.[1]).toBeCloseTo(0.001);
  });

  it('returns null for null or non-string input', () => {
    expect(vectorTransformer.from(null)).toBeNull();
    expect(vectorTransformer.from(undefined)).toBeNull();
    expect(vectorTransformer.from(123)).toBeNull();
    expect(vectorTransformer.from([1, 2, 3])).toBeNull();
  });

  it('returns null for an empty vector string', () => {
    expect(vectorTransformer.from('')).toBeNull();
    expect(vectorTransformer.from('[]')).toBeNull();
  });

  it('rejects a too-short vector instead of returning a partial array', () => {
    const values = Array.from({ length: 3 }, (_, i) => i);
    expect(vectorTransformer.from(makeVectorString(values))).toBeNull();
  });

  it('rejects a vector with a non-numeric token rather than coercing to NaN', () => {
    const values: (number | string)[] = Array.from(
      { length: VECTOR_DIM },
      () => 0,
    );
    values[5] = 'oops';
    const result = vectorTransformer.from(`[${values.join(',')}]`);

    expect(result).toBeNull();
  });
});

describe('vectorTransformer.to', () => {
  it('serializes a 1536-dim number array to a bracketed string', () => {
    const values = Array.from({ length: VECTOR_DIM }, () => 0);
    expect(vectorTransformer.to(values)).toBe(makeVectorString(values));
  });

  it('returns null for a wrong-length array', () => {
    expect(vectorTransformer.to([1, 2, 3])).toBeNull();
  });

  it('returns null for null or non-array input', () => {
    expect(vectorTransformer.to(null)).toBeNull();
    expect(vectorTransformer.to('not-an-array')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { asMock } from '../as-mock';
import { isRecord } from '../is-record';

interface Example {
  readonly id: string;
  readonly nested: { readonly count: number };
}

describe('asMock', () => {
  it('returns the value unchanged at runtime', () => {
    const partial = { id: 'x' };
    const value = asMock<Example>(partial);

    expect(value).toBe(partial);
    expect(value.id).toBe('x');
  });

  it('retypes a factory-style partial without a runtime transform', () => {
    const fn = (): number => 42;
    const mocked = asMock<() => number>(fn);

    expect(mocked).toBe(fn);
    expect(mocked()).toBe(42);
  });
});

describe('isRecord', () => {
  it('accepts plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('rejects null, arrays, and primitives', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord('x')).toBe(false);
    expect(isRecord(7)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });

  it('narrows for safe property access', () => {
    const value: unknown = { date: '2024-01-01' };

    expect(isRecord(value) ? value.date : undefined).toBe('2024-01-01');
  });
});

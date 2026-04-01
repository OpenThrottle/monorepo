import { describe, expect, it } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const conditionFalse = false;
    const conditionTrue = true;
    expect(cn('foo', conditionFalse && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', conditionTrue && 'bar', 'baz')).toBe('foo bar baz');
  });

  it('should merge Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('should handle undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('should handle objects with conditional classes', () => {
    const result = cn({ bar: false, baz: true, foo: true });
    expect(result).toContain('foo');
    expect(result).toContain('baz');
    expect(result).not.toContain('bar');
  });

  it('should merge conflicting Tailwind utilities', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
  });

  it('should handle mixed inputs', () => {
    expect(cn('foo', ['bar', 'baz'], { qux: true }, 'quux')).toBe(
      'foo bar baz qux quux',
    );
  });
});

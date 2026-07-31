import { describe, expect, test } from 'vitest';
import { formatCpuMs, formatMb } from '../format-metric';

describe('formatMb', () => {
  test('formats to two decimal places', () => {
    expect(formatMb(12.3456)).toBe('12.35');
    expect(formatMb(0)).toBe('0.00');
  });
});

describe('formatCpuMs', () => {
  test('rounds to an integer and groups thousands', () => {
    expect(formatCpuMs(1234.9)).toBe('1,235');
    expect(formatCpuMs(0)).toBe('0');
  });
});

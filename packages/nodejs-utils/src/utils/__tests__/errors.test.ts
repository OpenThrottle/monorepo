import { describe, expect, it } from 'vitest';

import { toErrorMessage, toErrorMessageOr } from '../errors.ts';

describe('toErrorMessage', () => {
  it('returns the message of an Error', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('stringifies a non-Error value', () => {
    expect(toErrorMessage('plain string')).toBe('plain string');
    expect(toErrorMessage(42)).toBe('42');
    expect(toErrorMessage(undefined)).toBe('undefined');
  });

  it('returns an empty message as-is', () => {
    expect(toErrorMessage(new Error(''))).toBe('');
  });
});

describe('toErrorMessageOr', () => {
  it('keeps a non-blank message', () => {
    expect(toErrorMessageOr(new Error('boom'), 'fallback')).toBe('boom');
    expect(toErrorMessageOr(42, 'fallback')).toBe('42');
  });

  it('uses the fallback for an empty or whitespace-only message', () => {
    expect(toErrorMessageOr(new Error(''), 'fallback')).toBe('fallback');
    expect(toErrorMessageOr(new Error('   '), 'fallback')).toBe('fallback');
    expect(toErrorMessageOr('', 'fallback')).toBe('fallback');
  });
});

import { describe, expect, test } from 'vitest';
import {
  getActionError,
  isActionFailure,
  isActionSuccess,
} from '../action-result';

describe('getActionError', () => {
  test('returns undefined for null / undefined', () => {
    expect(getActionError(null)).toBeUndefined();
    expect(getActionError(undefined)).toBeUndefined();
  });

  test('returns undefined for non-object data', () => {
    expect(getActionError('error')).toBeUndefined();
    expect(getActionError(42)).toBeUndefined();
    expect(getActionError(true)).toBeUndefined();
  });

  test('returns undefined when there is no error field', () => {
    expect(getActionError({ ok: true })).toBeUndefined();
    expect(getActionError({})).toBeUndefined();
  });

  test('returns undefined for an empty-string error', () => {
    expect(getActionError({ error: '' })).toBeUndefined();
  });

  test('returns undefined for a non-string error', () => {
    expect(getActionError({ error: 123 })).toBeUndefined();
    expect(getActionError({ error: null })).toBeUndefined();
  });

  test('reads a bare { error } envelope', () => {
    expect(getActionError({ error: 'Boom' })).toBe('Boom');
  });

  test('reads the { ok: false, error } failure envelope', () => {
    expect(getActionError({ error: 'Nope', ok: false })).toBe('Nope');
  });
});

describe('isActionFailure', () => {
  test('is true for { ok: false, error }', () => {
    expect(isActionFailure({ error: 'x', ok: false })).toBe(true);
  });

  test('is false when ok is not false', () => {
    expect(isActionFailure({ error: 'x', ok: true })).toBe(false);
    expect(isActionFailure({ error: 'x' })).toBe(false);
  });

  test('is false when error is missing or empty', () => {
    expect(isActionFailure({ ok: false })).toBe(false);
    expect(isActionFailure({ error: '', ok: false })).toBe(false);
  });

  test('is false for nullish / non-object', () => {
    expect(isActionFailure(null)).toBe(false);
    expect(isActionFailure(undefined)).toBe(false);
    expect(isActionFailure('nope')).toBe(false);
  });
});

describe('isActionSuccess', () => {
  test('is true for { ok: true }', () => {
    expect(isActionSuccess({ ok: true })).toBe(true);
    expect(isActionSuccess({ id: 1, ok: true })).toBe(true);
  });

  test('is false for failure / missing ok', () => {
    expect(isActionSuccess({ error: 'x', ok: false })).toBe(false);
    expect(isActionSuccess({})).toBe(false);
  });

  test('is false for nullish / non-object', () => {
    expect(isActionSuccess(null)).toBe(false);
    expect(isActionSuccess(undefined)).toBe(false);
    expect(isActionSuccess(1)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { readActionError } from '../read-action-error';

describe('readActionError', () => {
  it('returns undefined for null or non-object data', () => {
    expect(readActionError(null, 'fooError')).toBeUndefined();
    expect(readActionError(undefined, 'fooError')).toBeUndefined();
    expect(readActionError('boom', 'fooError')).toBeUndefined();
  });

  it('returns undefined when the key is missing', () => {
    expect(readActionError({ other: 'x' }, 'fooError')).toBeUndefined();
  });

  it('returns undefined when the field is not a string', () => {
    expect(readActionError({ fooError: 42 }, 'fooError')).toBeUndefined();
  });

  it('returns the string field', () => {
    expect(readActionError({ fooError: 'bad' }, 'fooError')).toBe('bad');
  });
});

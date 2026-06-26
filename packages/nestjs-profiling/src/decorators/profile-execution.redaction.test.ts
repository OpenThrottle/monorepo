import { describe, expect, it } from 'vitest';
import {
  createProfileExecutionRedactor,
  defaultProfileExecutionRedactor,
} from './profile-execution.redaction';

describe('createProfileExecutionRedactor', () => {
  it('redacts default sensitive keys case-insensitively and by substring', () => {
    const redact = createProfileExecutionRedactor();
    const result = redact({
      Authorization: 'Bearer x',
      accessToken: 'abc',
      userEmail: 'a@b.com',
      userId: 7,
    });
    expect(result).toEqual({
      Authorization: '[REDACTED]',
      accessToken: '[REDACTED]',
      userEmail: '[REDACTED]',
      userId: 7,
    });
  });

  it('redacts nested objects and arrays', () => {
    const redact = createProfileExecutionRedactor();
    const result = redact({
      users: [
        { id: 1, password: 'p1' },
        { id: 2, password: 'p2' },
      ],
    });
    expect(result).toEqual({
      users: [
        { id: 1, password: '[REDACTED]' },
        { id: 2, password: '[REDACTED]' },
      ],
    });
  });

  it('truncates strings longer than maxStringLength', () => {
    const redact = createProfileExecutionRedactor({ maxStringLength: 5 });
    expect(redact('abcdefghij')).toBe('abcde[TRUNCATED:size]');
    expect(redact('abc')).toBe('abc');
  });

  it('truncates beyond maxDepth', () => {
    const redact = createProfileExecutionRedactor({ maxDepth: 2 });
    const result = redact({ a: { b: { c: 1 } } });
    expect(result).toEqual({ a: { b: '[TRUNCATED:depth]' } });
  });

  it('does not serialize class instances verbatim', () => {
    class Row {
      secretField = 'x';
    }
    const redact = createProfileExecutionRedactor();
    expect(redact(new Row())).toBe('[Row]');
  });

  it('supports a custom denylist', () => {
    const redact = createProfileExecutionRedactor({ denylist: ['ssn'] });
    const result = redact({ password: 'kept', ssn: '123-45-6789' });
    expect(result).toEqual({ password: 'kept', ssn: '[REDACTED]' });
  });

  it('preserves primitives and stringifies bigint', () => {
    expect(defaultProfileExecutionRedactor(42)).toBe(42);
    expect(defaultProfileExecutionRedactor(true)).toBe(true);
    expect(defaultProfileExecutionRedactor(null)).toBeNull();
    expect(defaultProfileExecutionRedactor(10n)).toBe('10');
  });
});

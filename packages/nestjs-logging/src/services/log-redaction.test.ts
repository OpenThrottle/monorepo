import { describe, expect, it } from 'vitest';
import type { JsonValue } from '../ports/logging-ports';
import {
  createLogRedactor,
  DEFAULT_LOG_REDACTOR,
  DEFAULT_REDACTION_REPLACEMENT,
} from './log-redaction';

describe('createLogRedactor (default-on)', () => {
  const redactor = createLogRedactor();

  it('replaces values of deny-listed keys regardless of value content', () => {
    const extra: Record<string, JsonValue> = {
      Token: 'plain-token',
      password: 'hunter2',
      userId: 42,
    };

    expect(redactor.redactValue(extra)).toEqual({
      Token: DEFAULT_REDACTION_REPLACEMENT,
      password: DEFAULT_REDACTION_REPLACEMENT,
      userId: 42,
    });
  });

  it('matches deny-list keys as case-insensitive substrings', () => {
    const extra: Record<string, JsonValue> = {
      AUTHORIZATION: 'Bearer foo',
      accessToken: 'abc',
      apiKeyHeader: 'xyz',
      safe: 'kept',
    };

    expect(redactor.redactValue(extra)).toEqual({
      AUTHORIZATION: DEFAULT_REDACTION_REPLACEMENT,
      accessToken: DEFAULT_REDACTION_REPLACEMENT,
      apiKeyHeader: DEFAULT_REDACTION_REPLACEMENT,
      safe: 'kept',
    });
  });

  it('redacts value patterns (bearer token, JWT, email) under non-deny keys', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const extra: Record<string, JsonValue> = {
      header: 'Bearer abc123.def',
      jwt,
      note: 'contact me at jane.doe@example.com please',
    };

    expect(redactor.redactValue(extra)).toEqual({
      header: DEFAULT_REDACTION_REPLACEMENT,
      jwt: DEFAULT_REDACTION_REPLACEMENT,
      note: `contact me at ${DEFAULT_REDACTION_REPLACEMENT} please`,
    });
  });

  it('recurses into nested objects and arrays', () => {
    const extra: Record<string, JsonValue> = {
      arr: ['ok', 'reach me at bob@x.io'],
      nested: { password: 'p' },
    };

    expect(redactor.redactValue(extra)).toEqual({
      arr: ['ok', `reach me at ${DEFAULT_REDACTION_REPLACEMENT}`],
      nested: { password: DEFAULT_REDACTION_REPLACEMENT },
    });
  });

  it('redacts every primitive under a deny-listed key (nested object)', () => {
    const extra: Record<string, JsonValue> = {
      credentials: { attempts: 3, pass: 'p', user: 'admin' },
    };

    expect(redactor.redactValue(extra)).toEqual({
      credentials: {
        attempts: DEFAULT_REDACTION_REPLACEMENT,
        pass: DEFAULT_REDACTION_REPLACEMENT,
        user: DEFAULT_REDACTION_REPLACEMENT,
      },
    });
  });

  it('redacts patterns inside message strings', () => {
    expect(
      redactor.redactString('login with Authorization: Bearer secret123'),
    ).toBe(`login with Authorization: ${DEFAULT_REDACTION_REPLACEMENT}`);
  });

  it('does not mutate the input value', () => {
    const extra = { keep: 1, password: 'p' };
    redactor.redactValue(extra);
    expect(extra).toEqual({ keep: 1, password: 'p' });
  });

  it('is deterministic across repeated calls (global regex lastIndex reset)', () => {
    const value = 'a@b.com and c@d.com';
    const first = redactor.redactString(value);
    const second = redactor.redactString(value);
    expect(first).toBe(second);
    expect(first).toBe(
      `${DEFAULT_REDACTION_REPLACEMENT} and ${DEFAULT_REDACTION_REPLACEMENT}`,
    );
  });

  it('exposes a shared default-on redactor', () => {
    expect(DEFAULT_LOG_REDACTOR.redactMessageEnabled).toBe(true);
    expect(DEFAULT_LOG_REDACTOR.redactValue({ token: 't' })).toEqual({
      token: DEFAULT_REDACTION_REPLACEMENT,
    });
  });
});

describe('createLogRedactor (custom + disabled)', () => {
  it('honors custom keys, patterns, and replacement', () => {
    const redactor = createLogRedactor({
      keys: ['custom'],
      patterns: [/\bxyz\b/g],
      replacement: '***',
    });

    expect(
      redactor.redactValue({
        custom: 'a',
        other: 'has xyz here',
        password: 'p',
      }),
    ).toEqual({
      custom: '***',
      other: 'has *** here',
      // 'password' is no longer in the deny-list because keys was overridden
      password: 'p',
    });
  });

  it('redactMessage:false leaves message untouched', () => {
    const redactor = createLogRedactor({ redactMessage: false });
    expect(redactor.redactMessageEnabled).toBe(false);
  });

  it('false disables redaction entirely (no-op)', () => {
    const redactor = createLogRedactor(false);
    const extra: Record<string, JsonValue> = {
      email: 'a@b.com',
      password: 'p',
    };

    expect(redactor.redactMessageEnabled).toBe(false);
    expect(redactor.redactValue(extra)).toEqual(extra);
    expect(redactor.redactString('Bearer x')).toBe('Bearer x');
  });
});

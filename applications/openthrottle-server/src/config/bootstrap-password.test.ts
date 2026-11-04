import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BOOTSTRAP_USER_PASSWORD,
  isRefusedDefaultPassword,
  resolveBootstrapUserPassword,
} from './bootstrap-password.ts';

describe('resolveBootstrapUserPassword', () => {
  it('falls back to the default locally', () => {
    expect(resolveBootstrapUserPassword(undefined, false)).toBe(
      DEFAULT_BOOTSTRAP_USER_PASSWORD,
    );
    expect(resolveBootstrapUserPassword('  ', false)).toBe(
      DEFAULT_BOOTSTRAP_USER_PASSWORD,
    );
  });

  it('uses the env value when set', () => {
    expect(resolveBootstrapUserPassword(' s3cret-pass ', true)).toBe(
      's3cret-pass',
    );
  });

  it('refuses an unset password in production', () => {
    expect(() => resolveBootstrapUserPassword(undefined, true)).toThrow(
      /OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD/,
    );
  });

  it('refuses the default password in production even when passed explicitly', () => {
    expect(() =>
      resolveBootstrapUserPassword(DEFAULT_BOOTSTRAP_USER_PASSWORD, true),
    ).toThrow(/non-default/);
  });
});

describe('isRefusedDefaultPassword', () => {
  it('refuses the default password only in production', () => {
    expect(
      isRefusedDefaultPassword(DEFAULT_BOOTSTRAP_USER_PASSWORD, true),
    ).toBe(true);
    expect(
      isRefusedDefaultPassword(DEFAULT_BOOTSTRAP_USER_PASSWORD, false),
    ).toBe(false);
    expect(isRefusedDefaultPassword('something-else', true)).toBe(false);
  });
});

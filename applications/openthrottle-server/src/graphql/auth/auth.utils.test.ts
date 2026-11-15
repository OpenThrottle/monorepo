import { describe, expect, test } from 'vitest';

import { assertJwtSecretAllowed, isCommittedJwtSecret } from './auth.utils.ts';

// Rebuilt from parts so the committed literal is not repeated in source.
const COMMITTED_DEFAULT = ['OpenThrottle', '2026', 'default', 'secret'].join(
  '_',
);
const STRONG_SECRET = 'x'.repeat(48);

describe('isCommittedJwtSecret', () => {
  test('recognises the committed .env.default secret', () => {
    expect(isCommittedJwtSecret(COMMITTED_DEFAULT)).toBe(true);
  });

  test('does not flag an unrelated secret', () => {
    expect(isCommittedJwtSecret(STRONG_SECRET)).toBe(false);
  });
});

describe('assertJwtSecretAllowed', () => {
  describe('in production', () => {
    test('throws on the committed default', () => {
      expect(() => {
        assertJwtSecretAllowed({
          allowDefault: undefined,
          nodeEnv: 'production',
          secret: COMMITTED_DEFAULT,
        });
      }).toThrow(/committed to this repository/);
    });

    test('allows the committed default with the explicit override', () => {
      expect(() => {
        assertJwtSecretAllowed({
          allowDefault: 'TRUE',
          nodeEnv: 'production',
          secret: COMMITTED_DEFAULT,
        });
      }).not.toThrow();
    });

    test('allows a non-default secret', () => {
      expect(() => {
        assertJwtSecretAllowed({
          allowDefault: undefined,
          nodeEnv: 'production',
          secret: STRONG_SECRET,
        });
      }).not.toThrow();
    });

    test('leaves a missing secret to JwtStrategy', () => {
      expect(() => {
        assertJwtSecretAllowed({
          allowDefault: undefined,
          nodeEnv: 'production',
          secret: undefined,
        });
      }).not.toThrow();
    });
  });

  describe('outside production', () => {
    test('allows the committed default', () => {
      expect(() => {
        assertJwtSecretAllowed({
          allowDefault: undefined,
          nodeEnv: 'development',
          secret: COMMITTED_DEFAULT,
        });
      }).not.toThrow();
    });
  });
});

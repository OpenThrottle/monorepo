import { describe, expect, test } from 'vitest';

import { isDevelopmentGraphqlEnabled } from './development.utils.ts';

describe('isDevelopmentGraphqlEnabled', () => {
  describe('when OT_ENABLE_DEV_GRAPHQL is unset', () => {
    test('is off in production', () => {
      expect(isDevelopmentGraphqlEnabled({ NODE_ENV: 'production' })).toBe(
        false,
      );
    });

    test('is on in development', () => {
      expect(isDevelopmentGraphqlEnabled({ NODE_ENV: 'development' })).toBe(
        true,
      );
    });

    test('is on when NODE_ENV is unset (schema generation, tests)', () => {
      expect(isDevelopmentGraphqlEnabled({})).toBe(true);
    });
  });

  describe('when OT_ENABLE_DEV_GRAPHQL is set', () => {
    test('true turns it on in production', () => {
      expect(
        isDevelopmentGraphqlEnabled({
          NODE_ENV: 'production',
          OT_ENABLE_DEV_GRAPHQL: ' TRUE ',
        }),
      ).toBe(true);
    });

    test('false turns it off in development', () => {
      expect(
        isDevelopmentGraphqlEnabled({
          NODE_ENV: 'development',
          OT_ENABLE_DEV_GRAPHQL: 'false',
        }),
      ).toBe(false);
    });

    test('an unrecognised value falls back to the NODE_ENV default', () => {
      expect(
        isDevelopmentGraphqlEnabled({
          NODE_ENV: 'production',
          OT_ENABLE_DEV_GRAPHQL: 'yes',
        }),
      ).toBe(false);
    });
  });
});

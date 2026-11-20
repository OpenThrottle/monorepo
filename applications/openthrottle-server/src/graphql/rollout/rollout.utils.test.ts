/**
 * @description Unit tests for resolveEvaluationPrincipal (auth > anonymousId >
 * degraded shared subject).
 */

import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { describe, expect, test } from 'vitest';

import { ROLLOUT_DEGRADED_ANONYMOUS_SUB } from './rollout.constants.ts';
import { resolveEvaluationPrincipal } from './rollout.utils.ts';

const ANONYMOUS_ID = '01a1f71f-0a23-7a90-8d99-db6b6c205d95';

const userPrincipal: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: 'user-1',
};

const serviceAccountPrincipal: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: 'sa-1',
};

describe('resolveEvaluationPrincipal', () => {
  describe('when an authenticated principal is present', () => {
    test('returns the user principal and ignores anonymousId', () => {
      expect(resolveEvaluationPrincipal(userPrincipal, ANONYMOUS_ID)).toEqual(
        userPrincipal,
      );
    });

    test('returns the service-account principal', () => {
      expect(
        resolveEvaluationPrincipal(serviceAccountPrincipal, ANONYMOUS_ID),
      ).toEqual(serviceAccountPrincipal);
    });
  });

  describe('when unauthenticated', () => {
    test('builds a user-shaped principal from anonymousId', () => {
      expect(resolveEvaluationPrincipal(undefined, ANONYMOUS_ID)).toEqual({
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: ANONYMOUS_ID,
      });
    });

    test('trims whitespace on anonymousId', () => {
      expect(
        resolveEvaluationPrincipal(undefined, `  ${ANONYMOUS_ID}  `),
      ).toEqual({
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: ANONYMOUS_ID,
      });
    });

    test('uses degraded shared subject when anonymousId is missing', () => {
      expect(resolveEvaluationPrincipal(undefined, undefined)).toEqual({
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: ROLLOUT_DEGRADED_ANONYMOUS_SUB,
      });
    });

    test('uses degraded shared subject when anonymousId is empty/whitespace', () => {
      expect(resolveEvaluationPrincipal(undefined, '   ')).toEqual({
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: ROLLOUT_DEGRADED_ANONYMOUS_SUB,
      });
      expect(resolveEvaluationPrincipal(undefined, null)).toEqual({
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: ROLLOUT_DEGRADED_ANONYMOUS_SUB,
      });
    });

    test('accepts an upper-case UUID of any version', () => {
      const upper = ANONYMOUS_ID.toUpperCase();
      expect(resolveEvaluationPrincipal(undefined, upper)).toEqual({
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: upper,
      });
    });

    test.each([
      'verify-anon',
      'not-a-uuid-at-all',
      `${ANONYMOUS_ID}x`,
      "1' OR '1'='1",
    ])(
      'uses degraded shared subject when anonymousId %j is not a UUID',
      (anonymousId) => {
        expect(resolveEvaluationPrincipal(undefined, anonymousId)).toEqual({
          kind: AUTH_PRINCIPAL_KIND_USER,
          sub: ROLLOUT_DEGRADED_ANONYMOUS_SUB,
        });
      },
    );
  });
});

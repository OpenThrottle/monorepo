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
import {
  resolveEvaluationPrincipal,
  ROLLOUT_DEGRADED_ANONYMOUS_SUB,
} from './resolve-evaluation-principal';

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
      expect(resolveEvaluationPrincipal(userPrincipal, 'anon-uuid')).toEqual(
        userPrincipal,
      );
    });

    test('returns the service-account principal', () => {
      expect(
        resolveEvaluationPrincipal(serviceAccountPrincipal, 'anon-uuid'),
      ).toEqual(serviceAccountPrincipal);
    });
  });

  describe('when unauthenticated', () => {
    test('builds a user-shaped principal from anonymousId', () => {
      expect(resolveEvaluationPrincipal(undefined, 'anon-uuid')).toEqual({
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: 'anon-uuid',
      });
    });

    test('trims whitespace on anonymousId', () => {
      expect(resolveEvaluationPrincipal(undefined, '  anon-uuid  ')).toEqual({
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: 'anon-uuid',
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
  });
});

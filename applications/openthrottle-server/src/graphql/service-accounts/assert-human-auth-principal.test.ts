import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertHumanAuthPrincipal } from './assert-human-auth-principal';

describe('assertHumanAuthPrincipal', () => {
  it('returns user principal when kind is user', () => {
    const principal = {
      kind: AUTH_PRINCIPAL_KIND_USER,
      sub: 'user-1',
    };

    expect(assertHumanAuthPrincipal(principal).sub).toBe('user-1');
  });

  it('throws when principal is a service account', () => {
    expect(() =>
      assertHumanAuthPrincipal({
        kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
        sub: 'sa-1',
      }),
    ).toThrow(ForbiddenException);
  });

  it('throws when principal is missing', () => {
    expect(() => assertHumanAuthPrincipal(undefined)).toThrow(
      ForbiddenException,
    );
  });
});

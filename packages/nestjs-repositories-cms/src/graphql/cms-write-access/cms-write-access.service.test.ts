import { createMock } from '@golevelup/ts-vitest';
import type { ModuleRef } from '@nestjs/core';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import { describe, expect, it, vi } from 'vitest';

import { CmsWriteAccessService } from './cms-write-access.service.ts';
import type { CmsWriteAuthorizer } from './cms-write-access.types.ts';

const buildService = (authorizer: CmsWriteAuthorizer | null) => {
  const moduleRef = createMock<ModuleRef>();

  vi.mocked(moduleRef.get).mockImplementation(() => {
    if (!authorizer) {
      throw new Error('not found');
    }

    return authorizer;
  });

  return new CmsWriteAccessService(moduleRef);
};

const SIGNED_IN = { user: { kind: AUTH_PRINCIPAL_KIND_USER, sub: 'u1' } };

const WRITER = {
  email: 'a@example.test',
  kind: 'user',
  userId: 'u1',
} as const;

describe('CmsWriteAccessService', () => {
  describe('when nobody is signed in', () => {
    it('refuses as UNAUTHENTICATED without asking the authorizer', async () => {
      const authorize = vi.fn();
      const service = buildService({ authorize });

      await expect(service.authorize({})).resolves.toMatchObject({
        code: 'UNAUTHENTICATED',
        ok: false,
      });
      await expect(service.canWrite(undefined)).resolves.toBe(false);
      expect(authorize).not.toHaveBeenCalled();
    });
  });

  describe('when the host registers no authorizer', () => {
    it('fails closed as FORBIDDEN', async () => {
      const service = buildService(null);

      await expect(service.authorize(SIGNED_IN)).resolves.toMatchObject({
        code: 'FORBIDDEN',
        ok: false,
      });
      await expect(service.canWrite(SIGNED_IN)).resolves.toBe(false);
    });
  });

  describe('when the authorizer refuses', () => {
    it('is FORBIDDEN with its reason', async () => {
      const service = buildService({
        authorize: async () => {
          return { ok: false, reason: 'Missing permission: cms:write' };
        },
      });

      await expect(service.authorize(SIGNED_IN)).resolves.toEqual({
        code: 'FORBIDDEN',
        ok: false,
        reason: 'Missing permission: cms:write',
      });
      await expect(service.canWrite(SIGNED_IN)).resolves.toBe(false);
    });
  });

  describe('when the authorizer allows', () => {
    it('returns the writer', async () => {
      const service = buildService({
        authorize: async () => {
          return { ok: true, writer: WRITER };
        },
      });

      await expect(service.authorize(SIGNED_IN)).resolves.toEqual({
        ok: true,
        writer: WRITER,
      });
      await expect(service.canWrite(SIGNED_IN)).resolves.toBe(true);
    });
  });
});

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { ROLES } from '../roles';
import { RolesGuard } from './roles.guard';

function createMockContext(
  user: { roles?: readonly string[] } | undefined,
): ExecutionContext {
  const request = { user };

  // FIXME: Swap out eventually
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    getClass: vi.fn(),
    getHandler: vi.fn(),
    switchToHttp: vi.fn(() => ({
      getRequest: () => request,
    })),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  describe('when no @Roles() metadata', () => {
    it('allows access', () => {
      const ctx = createMockContext(undefined);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('when @Roles() metadata is set', () => {
    it('allows access when user has required role', () => {
      const ctx = createMockContext({ roles: [ROLES.ADMIN] });
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        ROLES.ADMIN,
      ]);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows access when user has one of multiple required roles', () => {
      const ctx = createMockContext({ roles: [ROLES.USER] });
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        ROLES.ADMIN,
        ROLES.USER,
      ]);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws ForbiddenException when user has no roles', () => {
      const ctx = createMockContext({});
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        ROLES.ADMIN,
      ]);
      expect(() => guard.canActivate(ctx)).toThrow('Authentication required');
    });

    it('throws ForbiddenException when user lacks required role', () => {
      const ctx = createMockContext({ roles: [ROLES.VIEWER] });
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        ROLES.ADMIN,
      ]);
      expect(() => guard.canActivate(ctx)).toThrow(
        'Insufficient role. Required one of: admin',
      );
    });
  });
});

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { PERMISSIONS, ROLES } from '../roles';
import { PermissionsGuard } from './permissions.guard';

function createMockContext(
  user: { roles?: readonly string[] } | undefined,
): ExecutionContext {
  const request = { user };

  // FIXME: Swap out eventually

  return {
    getClass: vi.fn(),
    getHandler: vi.fn(),
    switchToHttp: vi.fn(() => ({
      getRequest: () => request,
    })),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const guard = new PermissionsGuard(new Reflector());

  describe('when no @Permissions() metadata', () => {
    it('allows access', () => {
      const ctx = createMockContext(undefined);
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(
        undefined,
      );
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('when @Permissions() metadata is set', () => {
    it('allows access when user role has required permission', () => {
      const ctx = createMockContext({ roles: [ROLES.ADMIN] });
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        PERMISSIONS.USERS_WRITE,
      ]);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows access when user has permission via one of multiple roles', () => {
      const ctx = createMockContext({ roles: [ROLES.USER, ROLES.ADMIN] });
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        PERMISSIONS.USERS_WRITE,
      ]);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws ForbiddenException when user has no roles', () => {
      const ctx = createMockContext({});
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        PERMISSIONS.USERS_READ,
      ]);
      expect(() => guard.canActivate(ctx)).toThrow('No roles assigned');
    });

    it('throws ForbiddenException when user lacks required permission', () => {
      const ctx = createMockContext({ roles: [ROLES.VIEWER] });
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        PERMISSIONS.USERS_WRITE,
      ]);
      expect(() => guard.canActivate(ctx)).toThrow(
        'Missing permission: users:write',
      );
    });
  });
});

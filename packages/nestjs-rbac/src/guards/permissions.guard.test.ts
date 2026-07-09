import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Permissions } from '../decorators/permissions.decorator';
import { PERMISSIONS, ROLES } from '../roles';
import { PermissionsGuard } from './permissions.guard';

function createMockContext(
  user: { roles?: unknown } | undefined,
  handler: () => void = () => undefined,
  klass: unknown = class {},
): ExecutionContext {
  const request = { user };

  // FIXME: Swap out eventually

  return asMock<ExecutionContext>({
    getClass: vi.fn(() => klass),
    getHandler: vi.fn(() => handler),
    switchToHttp: vi.fn(() => ({
      getRequest: () => request,
    })),
  });
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

    it('requires ALL permissions (AND): throws on the one the user lacks', () => {
      // user role has USERS_READ but not USERS_WRITE.
      const ctx = createMockContext({ roles: [ROLES.USER] });
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        PERMISSIONS.USERS_READ,
        PERMISSIONS.USERS_WRITE,
      ]);
      expect(() => guard.canActivate(ctx)).toThrow(
        'Missing permission: users:write',
      );
    });

    it('treats a non-array roles claim as no roles (defensive)', () => {
      // A hand-crafted JWT with `roles: "admin"` (string) must not be trusted:
      // string .includes / per-char iteration could otherwise grant access.
      const ctx = createMockContext({ roles: 'admin' });
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        PERMISSIONS.USERS_WRITE,
      ]);
      expect(() => guard.canActivate(ctx)).toThrow('No roles assigned');
    });
  });

  describe('class-level @Permissions() metadata', () => {
    // Use a real Reflector against a decorated class so getAllAndOverride
    // actually resolves metadata from getClass() (not just the handler).
    const realGuard = new PermissionsGuard(new Reflector());

    @Permissions(PERMISSIONS.USERS_WRITE)
    class WriteScopedController {}

    // Earlier describe blocks spy on Reflector.prototype.getAllAndOverride;
    // restore so the real implementation resolves the class metadata here.
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('honors class-level metadata when the handler has none', () => {
      const handler = (): void => undefined;
      const allowCtx = createMockContext(
        { roles: [ROLES.ADMIN] },
        handler,
        WriteScopedController,
      );
      expect(realGuard.canActivate(allowCtx)).toBe(true);

      const denyCtx = createMockContext(
        { roles: [ROLES.VIEWER] },
        handler,
        WriteScopedController,
      );
      expect(() => realGuard.canActivate(denyCtx)).toThrow(
        'Missing permission: users:write',
      );
    });
  });
});

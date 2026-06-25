import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Roles } from '../decorators/roles.decorator';
import { ROLES } from '../roles';
import { RolesGuard } from './roles.guard';

function createMockContext(
  user: { roles?: unknown } | undefined,
  handler: () => void = () => undefined,
  klass: unknown = class {},
): ExecutionContext {
  const request = { user };

  // FIXME: Swap out eventually

  return {
    getClass: vi.fn(() => klass),
    getHandler: vi.fn(() => handler),
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
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(
        undefined,
      );
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
      expect(() => guard.canActivate(ctx)).toThrow(
        'Insufficient role. Required one of: admin',
      );
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

    it('treats a non-array roles claim as no roles (defensive)', () => {
      // A hand-crafted JWT with `roles: "admin"` (string) must not satisfy
      // `@Roles(ADMIN)` via substring matching on String.prototype.includes.
      const ctx = createMockContext({ roles: 'admin' });
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        ROLES.ADMIN,
      ]);
      expect(() => guard.canActivate(ctx)).toThrow(
        'Insufficient role. Required one of: admin',
      );
    });

    it('does not false-positive when a role name is a substring of the claim string', () => {
      // "superadmin".includes("admin") is true; treating the claim as an array prevents this.
      const ctx = createMockContext({ roles: 'superadmin' });
      vi.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([
        ROLES.ADMIN,
      ]);
      expect(() => guard.canActivate(ctx)).toThrow(
        'Insufficient role. Required one of: admin',
      );
    });
  });

  describe('class-level @Roles() metadata', () => {
    // Use a real Reflector against a decorated class so getAllAndOverride
    // actually resolves metadata from getClass() (not just the handler).
    const realGuard = new RolesGuard(new Reflector());

    @Roles(ROLES.ADMIN)
    class AdminController {}

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
        AdminController,
      );
      expect(realGuard.canActivate(allowCtx)).toBe(true);

      const denyCtx = createMockContext(
        { roles: [ROLES.VIEWER] },
        handler,
        AdminController,
      );
      expect(() => realGuard.canActivate(denyCtx)).toThrow(
        'Insufficient role. Required one of: admin',
      );
    });
  });
});

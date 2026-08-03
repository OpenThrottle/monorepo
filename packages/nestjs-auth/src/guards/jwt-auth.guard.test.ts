import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { asMock } from '@openthrottle/nestjs-testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

const createContext = (): ExecutionContext =>
  asMock<ExecutionContext>({
    getClass: vi.fn().mockReturnValue(class TestController {}),
    getHandler: vi.fn().mockReturnValue(() => undefined),
  });

describe('JwtAuthGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('short-circuits to true when the route is @Public()', () => {
      const reflector = new Reflector();
      const getAllAndOverride = vi
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(true);
      const guard = new JwtAuthGuard(reflector);
      const superCanActivate = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      );
      const context = createContext();

      expect(guard.canActivate(context)).toBe(true);
      expect(getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('delegates to Passport when the route is not @Public()', () => {
      const reflector = new Reflector();
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const guard = new JwtAuthGuard(reflector);
      const superCanActivate = vi
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);
      const context = createContext();

      expect(guard.canActivate(context)).toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(context);
    });
  });

  describe('tryAuthenticate', () => {
    it('returns true when Passport accepts the token', async () => {
      const guard = new JwtAuthGuard(new Reflector());
      vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      ).mockReturnValue(true);
      const context = createContext();

      await expect(guard.tryAuthenticate(context)).resolves.toBe(true);
    });

    it('returns false when Passport rejects (does not throw)', async () => {
      const guard = new JwtAuthGuard(new Reflector());
      vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(guard)),
        'canActivate',
      ).mockRejectedValue(new UnauthorizedException('Unauthorized'));
      const context = createContext();

      await expect(guard.tryAuthenticate(context)).resolves.toBe(false);
    });

    it('bypasses @Public short-circuit (always delegates to Passport)', async () => {
      const reflector = new Reflector();
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const guard = new JwtAuthGuard(reflector);
      const superCanActivate = vi
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);
      const context = createContext();

      await expect(guard.tryAuthenticate(context)).resolves.toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(context);
    });
  });

  describe('handleRequest (fail-closed)', () => {
    const guard = new JwtAuthGuard(new Reflector());
    const context = createContext();

    it('rethrows the Passport error when err is present', () => {
      const err = new Error('strategy boom');

      expect(() =>
        guard.handleRequest(err, { sub: 'user-1' }, undefined, context),
      ).toThrow(err);
    });

    it('prefers the error even when a user is also present', () => {
      const err = new UnauthorizedException('token expired');

      expect(() =>
        guard.handleRequest(err, { sub: 'user-1' }, undefined, context),
      ).toThrow(err);
    });

    it('throws UnauthorizedException when user is false', () => {
      expect(() =>
        guard.handleRequest(null, false, undefined, context),
      ).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is otherwise falsy (null)', () => {
      expect(() =>
        guard.handleRequest(null, asMock<false>(null), undefined, context),
      ).toThrow(UnauthorizedException);
    });

    it('returns the user when there is no error and a user is present', () => {
      const user = { sub: 'user-1' };

      expect(guard.handleRequest(null, user, undefined, context)).toBe(user);
    });
  });
});

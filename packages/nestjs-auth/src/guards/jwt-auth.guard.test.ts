import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

const createContext = (): ExecutionContext =>
  ({
    getClass: vi.fn().mockReturnValue(class TestController {}),
    getHandler: vi.fn().mockReturnValue(() => undefined),
  }) as unknown as ExecutionContext;

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
});

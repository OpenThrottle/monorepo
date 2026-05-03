import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createMock } from '@golevelup/ts-vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalClsAuthHook } from '../auth/global-cls-auth-hook.service';
import { GlobalJwtAuthGuard } from './global-jwt-auth.guard';
import { GqlJwtAuthGuard } from './gql-jwt-auth.guard';

const createHttpExecutionContext = (req: object): ExecutionContext =>
  createMock<ExecutionContext>({
    getClass: vi.fn().mockImplementation(() => class {}),
    getHandler: vi.fn().mockReturnValue(() => undefined),
    getType: vi.fn().mockReturnValue('http'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: () => req,
    }),
  });

describe('GlobalJwtAuthGuard', () => {
  let guard: GlobalJwtAuthGuard;
  let reflector: Reflector;
  let jwtAuthGuard: GqlJwtAuthGuard;
  let globalClsAuthHook: GlobalClsAuthHook;

  beforeEach(() => {
    vi.stubEnv('APP_ENABLE_AUTHENTICATION', 'true');
    reflector = createMock<Reflector>({
      getAllAndOverride: vi.fn(),
    });
    jwtAuthGuard = createMock<GqlJwtAuthGuard>({
      canActivate: vi.fn(),
    });
    globalClsAuthHook = createMock<GlobalClsAuthHook>({
      populateFromJwtPayload: vi.fn(),
    });

    guard = new GlobalJwtAuthGuard(reflector, jwtAuthGuard, globalClsAuthHook);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows @Public routes without running JWT or CLS hook', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    const ctx = createHttpExecutionContext({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(jwtAuthGuard.canActivate).not.toHaveBeenCalled();
    expect(globalClsAuthHook.populateFromJwtPayload).not.toHaveBeenCalled();
  });

  it('returns false when JWT guard rejects', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(false);
    const ctx = createHttpExecutionContext({
      user: { email: 'a@b.com', sub: 'x' },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(false);

    expect(globalClsAuthHook.populateFromJwtPayload).not.toHaveBeenCalled();
  });

  it('calls CLS hook after JWT success when request.user is a valid payload', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
    const payload = { email: 'u@example.com', sub: 'uuid-1' };
    const ctx = createHttpExecutionContext({ user: payload });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(globalClsAuthHook.populateFromJwtPayload).toHaveBeenCalledTimes(1);
    expect(globalClsAuthHook.populateFromJwtPayload).toHaveBeenCalledWith(
      payload,
    );
  });

  it('skips CLS hook when JWT succeeds but user payload is missing', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
    const ctx = createHttpExecutionContext({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(globalClsAuthHook.populateFromJwtPayload).not.toHaveBeenCalled();
  });
});

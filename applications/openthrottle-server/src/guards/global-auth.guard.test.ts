import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  authPrincipalFromJwtPayload,
  authPrincipalFromServiceAccountId,
} from '@openthrottle/nestjs-auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalClsAuthHook } from '../auth/global-cls-auth-hook.service';
import { ServiceAccountAuthService } from '../auth/service-account-auth.service';
import { GlobalAuthGuard } from './global-auth.guard';
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

describe('GlobalAuthGuard', () => {
  let guard: GlobalAuthGuard;
  let reflector: Reflector;
  let jwtAuthGuard: GqlJwtAuthGuard;
  let globalClsAuthHook: GlobalClsAuthHook;
  let serviceAccountAuthService: ServiceAccountAuthService;

  beforeEach(() => {
    reflector = createMock<Reflector>({
      getAllAndOverride: vi.fn(),
    });
    jwtAuthGuard = createMock<GqlJwtAuthGuard>({
      canActivate: vi.fn(),
    });
    globalClsAuthHook = createMock<GlobalClsAuthHook>({
      populateFromPrincipal: vi.fn(),
    });
    serviceAccountAuthService = createMock<ServiceAccountAuthService>({
      isServiceAccountAuthorization: vi.fn(),
      tryAuthenticateAuthorizationHeader: vi.fn(),
    });

    guard = new GlobalAuthGuard(
      reflector,
      jwtAuthGuard,
      globalClsAuthHook,
      serviceAccountAuthService,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows @Public routes without running auth or CLS hook', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    const ctx = createHttpExecutionContext({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(jwtAuthGuard.canActivate).not.toHaveBeenCalled();
    expect(
      serviceAccountAuthService.tryAuthenticateAuthorizationHeader,
    ).not.toHaveBeenCalled();
    expect(globalClsAuthHook.populateFromPrincipal).not.toHaveBeenCalled();
  });

  it('returns false when JWT guard rejects a non–service-account request', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(
      serviceAccountAuthService.isServiceAccountAuthorization,
    ).mockReturnValue(false);
    vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(false);
    const ctx = createHttpExecutionContext({
      headers: { authorization: 'Bearer eyJ.test' },
      user: { email: 'a@b.com', sub: 'x' },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(false);

    expect(globalClsAuthHook.populateFromPrincipal).not.toHaveBeenCalled();
  });

  it('calls CLS hook after JWT success when request.user is a valid payload', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(
      serviceAccountAuthService.isServiceAccountAuthorization,
    ).mockReturnValue(false);
    vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
    const payload = { email: 'u@example.com', sub: 'uuid-1' };
    const ctx = createHttpExecutionContext({ user: payload });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(globalClsAuthHook.populateFromPrincipal).toHaveBeenCalledTimes(1);
    expect(globalClsAuthHook.populateFromPrincipal).toHaveBeenCalledWith(
      authPrincipalFromJwtPayload(payload),
    );
  });

  it('authenticates service account bearer before JWT and populates CLS', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
    const saPrincipal = authPrincipalFromServiceAccountId(
      '11111111-1111-4111-8111-111111111111',
    );
    const req = {
      headers: { authorization: 'Bearer ***REMOVED-OT-TOKEN***' },
    };
    vi.mocked(
      serviceAccountAuthService.isServiceAccountAuthorization,
    ).mockReturnValue(true);
    vi.mocked(
      serviceAccountAuthService.tryAuthenticateAuthorizationHeader,
    ).mockResolvedValue(saPrincipal);
    const ctx = createHttpExecutionContext(req);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(jwtAuthGuard.canActivate).not.toHaveBeenCalled();
    expect(req).toMatchObject({ user: saPrincipal });
    expect(globalClsAuthHook.populateFromPrincipal).toHaveBeenCalledWith(
      saPrincipal,
    );
  });

  it('throws when service account bearer is present but invalid', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(
      serviceAccountAuthService.isServiceAccountAuthorization,
    ).mockReturnValue(true);
    vi.mocked(
      serviceAccountAuthService.tryAuthenticateAuthorizationHeader,
    ).mockResolvedValue(null);
    const ctx = createHttpExecutionContext({
      headers: { authorization: 'Bearer ot_sa_bad_bad' },
    });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(jwtAuthGuard.canActivate).not.toHaveBeenCalled();
    expect(globalClsAuthHook.populateFromPrincipal).not.toHaveBeenCalled();
  });

  it('skips CLS hook when JWT succeeds but user payload is missing', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(
      serviceAccountAuthService.isServiceAccountAuthorization,
    ).mockReturnValue(false);
    vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
    const ctx = createHttpExecutionContext({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(globalClsAuthHook.populateFromPrincipal).not.toHaveBeenCalled();
  });

  it('sets request.user to service account principal on success', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
    const principal = {
      kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
      sub: 'sa-id',
    };
    const req: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: 'Bearer ot_sa_prefix_secret' },
    };
    vi.mocked(
      serviceAccountAuthService.isServiceAccountAuthorization,
    ).mockReturnValue(true);
    vi.mocked(
      serviceAccountAuthService.tryAuthenticateAuthorizationHeader,
    ).mockResolvedValue(principal);
    const ctx = createHttpExecutionContext(req);

    await guard.canActivate(ctx);

    expect(req.user).toEqual(principal);
  });
});

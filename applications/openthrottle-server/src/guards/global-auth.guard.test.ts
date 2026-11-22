import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  authPrincipalFromJwtPayload,
  authPrincipalFromOAuthGrant,
  authPrincipalFromServiceAccountId,
} from '@openthrottle/nestjs-auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GlobalClsAuthHook } from '../auth/global-cls-auth-hook/global-cls-auth-hook.service.ts';
import type { OAuthAccessAuthService } from '../auth/oauth-access-auth/oauth-access-auth.service.ts';
import type { ServiceAccountAuthService } from '../auth/service-account-auth/service-account-auth.service.ts';
import { GlobalAuthGuard } from './global-auth.guard.ts';
import type { GqlJwtAuthGuard } from './gql-jwt-auth.guard.ts';

const createHttpExecutionContext = (req: object): ExecutionContext => {
  return createMock<ExecutionContext>({
    getClass: vi.fn().mockImplementation(() => class {}),
    getHandler: vi.fn().mockReturnValue(() => undefined),
    getType: vi.fn().mockReturnValue('http'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: () => req,
    }),
  });
};

describe('GlobalAuthGuard', () => {
  let guard: GlobalAuthGuard;
  let reflector: Reflector;
  let jwtAuthGuard: GqlJwtAuthGuard;
  let globalClsAuthHook: GlobalClsAuthHook;
  let serviceAccountAuthService: ServiceAccountAuthService;
  let oauthAccessAuthService: OAuthAccessAuthService;

  beforeEach(() => {
    reflector = createMock<Reflector>({
      getAllAndOverride: vi.fn(),
    });
    jwtAuthGuard = createMock<GqlJwtAuthGuard>({
      canActivate: vi.fn(),
      tryAuthenticate: vi.fn(),
    });
    globalClsAuthHook = createMock<GlobalClsAuthHook>({
      populateFromPrincipal: vi.fn(),
    });
    serviceAccountAuthService = createMock<ServiceAccountAuthService>({
      isServiceAccountAuthorization: vi.fn(),
      tryAuthenticateAuthorizationHeader: vi.fn(),
    });

    oauthAccessAuthService = createMock<OAuthAccessAuthService>({
      isOAuthAuthorization: vi.fn().mockReturnValue(false),
      tryAuthenticateAuthorizationHeader: vi.fn(),
    });

    guard = new GlobalAuthGuard(
      reflector,
      jwtAuthGuard,
      globalClsAuthHook,
      serviceAccountAuthService,
      oauthAccessAuthService,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('with an OAuth access token', () => {
    const readOnly = authPrincipalFromOAuthGrant('user-1', {
      clientId: 'ot_client_x',
      grantId: 'g-1',
      scopes: ['mcp:read'],
    });
    const readWrite = authPrincipalFromOAuthGrant('user-1', {
      clientId: 'ot_client_x',
      grantId: 'g-1',
      scopes: ['mcp:read', 'mcp:write'],
    });

    const graphqlContext = (
      req: object,
      operation: 'mutation' | 'query',
    ): ExecutionContext => {
      vi.spyOn(GqlExecutionContext, 'create').mockReturnValue(
        createMock<GqlExecutionContext>({
          getContext: vi.fn().mockReturnValue({ req }),
          getInfo: vi.fn().mockReturnValue({ operation: { operation } }),
        }),
      );
      return createMock<ExecutionContext>({
        getArgs: vi.fn().mockReturnValue([{}, {}, { req }, {}]),
        getClass: vi.fn().mockImplementation(() => class {}),
        getHandler: vi.fn().mockReturnValue(() => undefined),
        getType: vi.fn().mockReturnValue('graphql'),
      });
    };

    beforeEach(() => {
      vi.mocked(reflector.getAllAndOverride).mockReturnValue(false);
      vi.mocked(
        serviceAccountAuthService.isServiceAccountAuthorization,
      ).mockReturnValue(false);
      vi.mocked(oauthAccessAuthService.isOAuthAuthorization).mockReturnValue(
        true,
      );
    });

    it('authenticates as the consenting user', async () => {
      vi.mocked(
        oauthAccessAuthService.tryAuthenticateAuthorizationHeader,
      ).mockResolvedValue(readOnly);
      const req: { headers: { authorization: string }; user?: unknown } = {
        headers: { authorization: 'Bearer ot_oat_a_b' },
      };

      await expect(
        guard.canActivate(
          createHttpExecutionContext({ ...req, method: 'GET' }),
        ),
      ).resolves.toBe(true);

      expect(jwtAuthGuard.canActivate).not.toHaveBeenCalled();
      expect(globalClsAuthHook.populateFromPrincipal).toHaveBeenCalledWith(
        readOnly,
      );
    });

    it('401s an invalid token without falling through to JWT', async () => {
      vi.mocked(
        oauthAccessAuthService.tryAuthenticateAuthorizationHeader,
      ).mockResolvedValue(null);
      const ctx = createHttpExecutionContext({
        headers: { authorization: 'Bearer ot_oat_bad_token' },
      });

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwtAuthGuard.canActivate).not.toHaveBeenCalled();
    });

    it('refuses a GraphQL mutation for a read-only token', async () => {
      vi.mocked(
        oauthAccessAuthService.tryAuthenticateAuthorizationHeader,
      ).mockResolvedValue(readOnly);
      const ctx = graphqlContext(
        { headers: { authorization: 'Bearer ot_oat_a_b' } },
        'mutation',
      );

      await expect(guard.canActivate(ctx)).rejects.toThrow('mcp:write');
    });

    it('allows a GraphQL query for a read-only token', async () => {
      vi.mocked(
        oauthAccessAuthService.tryAuthenticateAuthorizationHeader,
      ).mockResolvedValue(readOnly);
      const ctx = graphqlContext(
        { headers: { authorization: 'Bearer ot_oat_a_b' } },
        'query',
      );

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('allows a GraphQL mutation for a read-write token', async () => {
      vi.mocked(
        oauthAccessAuthService.tryAuthenticateAuthorizationHeader,
      ).mockResolvedValue(readWrite);
      const ctx = graphqlContext(
        { headers: { authorization: 'Bearer ot_oat_a_b' } },
        'mutation',
      );

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('refuses a non-GET REST call for a read-only token', async () => {
      vi.mocked(
        oauthAccessAuthService.tryAuthenticateAuthorizationHeader,
      ).mockResolvedValue(readOnly);
      const ctx = createHttpExecutionContext({
        headers: { authorization: 'Bearer ot_oat_a_b' },
        method: 'POST',
      });

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  it('allows @Public routes with no Authorization without running auth or CLS', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    const ctx = createHttpExecutionContext({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(jwtAuthGuard.canActivate).not.toHaveBeenCalled();
    expect(jwtAuthGuard.tryAuthenticate).not.toHaveBeenCalled();
    expect(
      serviceAccountAuthService.tryAuthenticateAuthorizationHeader,
    ).not.toHaveBeenCalled();
    expect(globalClsAuthHook.populateFromPrincipal).not.toHaveBeenCalled();
  });

  it('soft-auths JWT on @Public when Authorization is present', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    vi.mocked(
      serviceAccountAuthService.isServiceAccountAuthorization,
    ).mockReturnValue(false);
    vi.mocked(jwtAuthGuard.tryAuthenticate).mockResolvedValue(true);
    const payload = { email: 'u@example.com', sub: 'uuid-1' };
    const ctx = createHttpExecutionContext({
      headers: { authorization: 'Bearer eyJ.test' },
      user: payload,
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(jwtAuthGuard.tryAuthenticate).toHaveBeenCalled();
    expect(jwtAuthGuard.canActivate).not.toHaveBeenCalled();
    expect(globalClsAuthHook.populateFromPrincipal).toHaveBeenCalledWith(
      authPrincipalFromJwtPayload(payload),
    );
  });

  it('stays anonymous on @Public when JWT soft-auth fails (no 401)', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    vi.mocked(
      serviceAccountAuthService.isServiceAccountAuthorization,
    ).mockReturnValue(false);
    vi.mocked(jwtAuthGuard.tryAuthenticate).mockResolvedValue(false);
    const ctx = createHttpExecutionContext({
      headers: { authorization: 'Bearer eyJ.bad' },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(globalClsAuthHook.populateFromPrincipal).not.toHaveBeenCalled();
  });

  it('soft-auths service account on @Public when bearer is valid', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    const saPrincipal = authPrincipalFromServiceAccountId(
      '11111111-1111-4111-8111-111111111111',
    );
    const req: { headers: { authorization: string }; user?: unknown } = {
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

    expect(req.user).toEqual(saPrincipal);
    expect(jwtAuthGuard.tryAuthenticate).not.toHaveBeenCalled();
    expect(globalClsAuthHook.populateFromPrincipal).toHaveBeenCalledWith(
      saPrincipal,
    );
  });

  it('stays anonymous on @Public when service account bearer is invalid (no 401)', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    vi.mocked(
      serviceAccountAuthService.isServiceAccountAuthorization,
    ).mockReturnValue(true);
    vi.mocked(
      serviceAccountAuthService.tryAuthenticateAuthorizationHeader,
    ).mockResolvedValue(null);
    const ctx = createHttpExecutionContext({
      headers: { authorization: 'Bearer ot_sa_bad_bad' },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(jwtAuthGuard.tryAuthenticate).not.toHaveBeenCalled();
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

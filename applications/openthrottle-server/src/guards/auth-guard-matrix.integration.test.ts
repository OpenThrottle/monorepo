/**
 * @description Integration-style guard matrix: {@link GlobalAuthGuard} + {@link GqlPermissionsGuard}
 * with real {@link ServiceAccountAuthService} and {@link ServiceAccountsService} (mocked repos).
 */

import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-vitest';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { PERMISSIONS, PERMISSIONS_KEY } from '@openthrottle/nestjs-rbac';
import {
  RolesService,
  SERVICE_ACCOUNT_BEARER_PREFIX,
  ServiceAccount,
  ServiceAccountCredential,
  ServiceAccountsService,
} from '@openthrottle/nestjs-repositories';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalClsAuthHook } from '../auth/global-cls-auth-hook.service';
import { ServiceAccountAuthService } from '../auth/service-account-auth.service';
import { GqlPermissionsGuard } from './gql-permissions.guard';
import { GlobalAuthGuard } from './global-auth.guard';
import { GqlJwtAuthGuard } from './gql-jwt-auth.guard';

const serviceAccountId = '11111111-1111-4111-8111-111111111111';
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const credentialId = '22222222-2222-4222-8222-222222222222';

const createHttpExecutionContext = (req: {
  headers?: { authorization?: string };
  user?: unknown;
}): ExecutionContext =>
  createMock<ExecutionContext>({
    getClass: vi.fn().mockImplementation(() => class {}),
    getHandler: vi.fn().mockReturnValue(() => undefined),
    getType: vi.fn().mockReturnValue('http'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: () => req,
    }),
  });

describe('auth guard matrix (GlobalAuthGuard + GqlPermissionsGuard)', () => {
  let globalAuthGuard: GlobalAuthGuard;
  let gqlPermissionsGuard: GqlPermissionsGuard;
  let reflector: Reflector;
  let jwtAuthGuard: GqlJwtAuthGuard;
  let rolesService: RolesService;
  let serviceAccountsService: ServiceAccountsService;
  let credentialRepository: {
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const serviceAccountRepository = { findOne: vi.fn() };
    credentialRepository = {
      findOne: vi.fn(),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    reflector = createMock<Reflector>({
      getAllAndOverride: vi.fn(),
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        GlobalAuthGuard,
        GqlPermissionsGuard,
        ServiceAccountAuthService,
        ServiceAccountsService,
        {
          provide: Reflector,
          useValue: reflector,
        },
        {
          provide: GqlJwtAuthGuard,
          useValue: createMock<GqlJwtAuthGuard>({ canActivate: vi.fn() }),
        },
        {
          provide: GlobalClsAuthHook,
          useValue: createMock<GlobalClsAuthHook>({
            populateFromPrincipal: vi.fn(),
          }),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(ServiceAccount),
          useValue: serviceAccountRepository,
        },
        {
          provide: getRepositoryToken(ServiceAccountCredential),
          useValue: credentialRepository,
        },
        {
          provide: RolesService,
          useValue: createMock<RolesService>({
            getPermissionsForServiceAccount: vi.fn(),
            getPermissionsForUser: vi.fn(),
          }),
        },
      ],
    }).compile();

    globalAuthGuard = moduleRef.get(GlobalAuthGuard);
    gqlPermissionsGuard = moduleRef.get(GqlPermissionsGuard);
    jwtAuthGuard = moduleRef.get(GqlJwtAuthGuard);
    rolesService = moduleRef.get(RolesService);
    serviceAccountsService = moduleRef.get(ServiceAccountsService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const runProtectedRoute = async (req: {
    headers?: { authorization?: string };
    user?: unknown;
  }): Promise<void> => {
    const ctx = createHttpExecutionContext(req);
    const authOk = await globalAuthGuard.canActivate(ctx);
    if (!authOk) {
      throw new UnauthorizedException('Global auth rejected');
    }

    await gqlPermissionsGuard.canActivate(ctx);
  };

  const stubRouteMetadata = (options: {
    isPublic?: boolean;
    permissions?: string[];
  }): void => {
    vi.mocked(reflector.getAllAndOverride).mockImplementation((key) => {
      if (key === PERMISSIONS_KEY) {
        return options.permissions;
      }

      return options.isPublic === true;
    });
  };

  describe('requires authentication', () => {
    it('rejects missing credentials before permissions guard runs', async () => {
      stubRouteMetadata({ permissions: [PERMISSIONS.PLANS_READ] });
      vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(false);
      const req = {};

      await expect(runProtectedRoute(req)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(
        rolesService.getPermissionsForServiceAccount,
      ).not.toHaveBeenCalled();
    });

    it('authenticates a valid ot_sa bearer and enforces plans:read', async () => {
      stubRouteMetadata({ permissions: [PERMISSIONS.PLANS_READ] });
      const secret = 'matrixSecret1';
      const prefix = 'matrixprefix';
      const hash = await serviceAccountsService.hashSecret(secret);
      credentialRepository.findOne.mockResolvedValue({
        expiresAt: null,
        id: credentialId,
        prefix,
        revokedAt: null,
        secretHash: hash,
        serviceAccount: { disabledAt: null },
        serviceAccountId,
      } as ServiceAccountCredential);
      vi.mocked(rolesService.getPermissionsForServiceAccount).mockResolvedValue(
        ['plans:read'],
      );

      const req = {
        headers: {
          authorization: `Bearer ${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_${secret}`,
        },
      };

      await expect(runProtectedRoute(req)).resolves.toBeUndefined();

      expect(jwtAuthGuard.canActivate).not.toHaveBeenCalled();
      expect(req.user).toMatchObject({
        kind: 'service_account',
        sub: serviceAccountId,
      });
      expect(rolesService.getPermissionsForServiceAccount).toHaveBeenCalledWith(
        serviceAccountId,
      );
    });

    it('returns 401 for revoked service account credentials', async () => {
      stubRouteMetadata({ permissions: [PERMISSIONS.PLANS_READ] });
      const secret = 'revokedSecret';
      const prefix = 'revprefix01';
      const hash = await serviceAccountsService.hashSecret(secret);
      credentialRepository.findOne.mockResolvedValue({
        expiresAt: null,
        id: credentialId,
        prefix,
        revokedAt: new Date(),
        secretHash: hash,
        serviceAccount: { disabledAt: null },
        serviceAccountId,
      } as ServiceAccountCredential);

      const req = {
        headers: {
          authorization: `Bearer ${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_${secret}`,
        },
      };

      await expect(runProtectedRoute(req)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(
        rolesService.getPermissionsForServiceAccount,
      ).not.toHaveBeenCalled();
    });

    it('returns 403 when service account lacks required permission', async () => {
      stubRouteMetadata({ permissions: [PERMISSIONS.PLANS_WRITE] });
      const secret = 'readOnlySec1';
      const prefix = 'readprefix1';
      const hash = await serviceAccountsService.hashSecret(secret);
      credentialRepository.findOne.mockResolvedValue({
        expiresAt: null,
        id: credentialId,
        prefix,
        revokedAt: null,
        secretHash: hash,
        serviceAccount: { disabledAt: null },
        serviceAccountId,
      } as ServiceAccountCredential);
      vi.mocked(rolesService.getPermissionsForServiceAccount).mockResolvedValue(
        ['plans:read'],
      );

      const req = {
        headers: {
          authorization: `Bearer ${SERVICE_ACCOUNT_BEARER_PREFIX}${prefix}_${secret}`,
        },
      };

      await expect(runProtectedRoute(req)).rejects.toThrow(ForbiddenException);
      await expect(runProtectedRoute(req)).rejects.toThrow(
        'Missing permission: plans:write',
      );
    });

    it('authenticates human JWT path and enforces user permissions', async () => {
      stubRouteMetadata({ permissions: [PERMISSIONS.USERS_READ] });
      vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
      vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
        'users:read',
      ]);
      const payload = { email: 'u@example.com', sub: userId };
      const req = {
        headers: { authorization: 'Bearer eyJ.test.token' },
        user: payload,
      };

      await expect(runProtectedRoute(req)).resolves.toBeUndefined();

      expect(rolesService.getPermissionsForUser).toHaveBeenCalledWith(userId);
    });

    it('returns 403 when human JWT principal lacks permission', async () => {
      stubRouteMetadata({ permissions: [PERMISSIONS.USERS_WRITE] });
      vi.mocked(jwtAuthGuard.canActivate).mockResolvedValue(true);
      vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
        'users:read',
      ]);
      const req = {
        headers: { authorization: 'Bearer eyJ.test.token' },
        user: {
          kind: AUTH_PRINCIPAL_KIND_USER,
          sub: userId,
        },
      };

      await expect(runProtectedRoute(req)).rejects.toThrow(
        'Missing permission: users:write',
      );
    });
  });
});

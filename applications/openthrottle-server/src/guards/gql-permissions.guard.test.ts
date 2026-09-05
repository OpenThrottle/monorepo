import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_USER,
  authPrincipalFromServiceAccountId,
} from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import type { RolesService } from '@openthrottle/nestjs-repositories';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GqlPermissionsGuard } from './gql-permissions.guard';

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const serviceAccountId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const createHttpExecutionContext = (req: {
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

describe('GqlPermissionsGuard', () => {
  let guard: GqlPermissionsGuard;
  let reflector: Reflector;
  let rolesService: RolesService;

  beforeEach(() => {
    reflector = createMock<Reflector>({
      getAllAndOverride: vi.fn(),
    });
    rolesService = createMock<RolesService>({
      getPermissionsForServiceAccount: vi.fn(),
      getPermissionsForUser: vi.fn(),
    });
    guard = new GqlPermissionsGuard(reflector, rolesService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows access when no @Permissions() metadata is set', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);
    const ctx = createHttpExecutionContext({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(rolesService.getPermissionsForUser).not.toHaveBeenCalled();
  });

  it('resolves permissions via getPermissionsForUser for user principals', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([
      PERMISSIONS.USERS_READ,
    ]);
    vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
      'users:read',
    ]);
    const ctx = createHttpExecutionContext({
      user: {
        email: 'user@example.com',
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: userId,
      },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(rolesService.getPermissionsForUser).toHaveBeenCalledWith(userId);
    expect(rolesService.getPermissionsForServiceAccount).not.toHaveBeenCalled();
  });

  it('resolves permissions via getPermissionsForServiceAccount for service accounts', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([
      PERMISSIONS.SETTINGS_READ,
    ]);
    vi.mocked(rolesService.getPermissionsForServiceAccount).mockResolvedValue([
      'settings:read',
    ]);
    const principal = authPrincipalFromServiceAccountId(serviceAccountId);
    const ctx = createHttpExecutionContext({ user: principal });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(rolesService.getPermissionsForServiceAccount).toHaveBeenCalledWith(
      serviceAccountId,
    );
    expect(rolesService.getPermissionsForUser).not.toHaveBeenCalled();
  });

  it('accepts legacy JWT payloads without kind as user principals', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([
      PERMISSIONS.USERS_READ,
    ]);
    vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
      'users:read',
    ]);
    const ctx = createHttpExecutionContext({
      user: { email: 'user@example.com', sub: userId },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    expect(rolesService.getPermissionsForUser).toHaveBeenCalledWith(userId);
  });

  it('throws ForbiddenException when principal is missing', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([
      PERMISSIONS.USERS_READ,
    ]);
    const ctx = createHttpExecutionContext({});

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Authentication required',
    );
  });

  it('throws ForbiddenException when principal lacks required permission', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([
      PERMISSIONS.USERS_WRITE,
    ]);
    vi.mocked(rolesService.getPermissionsForUser).mockResolvedValue([
      'users:read',
    ]);
    const ctx = createHttpExecutionContext({
      user: {
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: userId,
      },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Missing permission: users:write',
    );
  });

  it('throws ForbiddenException when service account lacks required permission', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([
      PERMISSIONS.SETTINGS_WRITE,
    ]);
    vi.mocked(rolesService.getPermissionsForServiceAccount).mockResolvedValue(
      [],
    );
    const ctx = createHttpExecutionContext({
      user: authPrincipalFromServiceAccountId(serviceAccountId),
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Missing permission: settings:write',
    );
    expect(rolesService.getPermissionsForServiceAccount).toHaveBeenCalledWith(
      serviceAccountId,
    );
  });
});

/**
 * @description After auth validation, maps DB identity + RBAC into {@link GlobalClsService} for the request.
 */

import { Injectable } from '@nestjs/common';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  authPrincipalFromJwtPayload,
  type AuthPrincipal,
  type JwtPayload,
} from '@openthrottle/nestjs-auth';
import {
  GlobalClsService,
  globalClsUserFromJwtLike,
} from '@openthrottle/nestjs-modules';
import {
  RolesService,
  ServiceAccountsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';

@Injectable()
export class GlobalClsAuthHook {
  constructor(
    private readonly globalCls: GlobalClsService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly serviceAccountsService: ServiceAccountsService,
  ) {}

  /**
   * @description Populates CLS from a validated {@link AuthPrincipal} (user JWT or service account).
   */
  async populateFromPrincipal(principal: AuthPrincipal): Promise<void> {
    if (principal.kind === AUTH_PRINCIPAL_KIND_USER) {
      await this.populateUserPrincipal(principal);
      return;
    }

    if (principal.kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT) {
      await this.populateServiceAccountPrincipal(principal);
    }
  }

  /**
   * @description Loads the user row and permissions when possible; otherwise falls back to JWT-only mapping.
   */
  async populateFromJwtPayload(payload: JwtPayload): Promise<void> {
    await this.populateFromPrincipal(authPrincipalFromJwtPayload(payload));
  }

  private async populateUserPrincipal(
    principal: Extract<
      AuthPrincipal,
      { kind: typeof AUTH_PRINCIPAL_KIND_USER }
    >,
  ): Promise<void> {
    const row = await this.usersService.findById(principal.sub);

    if (row == null) {
      this.globalCls.setUser(globalClsUserFromJwtLike(principal));
      return;
    }

    const [permissions, roles] = await Promise.all([
      this.rolesService.getPermissionsForUser(row.id),
      this.rolesService.findRoleNamesByUserId(row.id),
    ]);

    this.globalCls.setUser({
      displayName: row.githubUsername,
      email: row.email ?? principal.email ?? '',
      isDeleted: row.disabledAt != null,
      permissions,
      roles,
      uuid: row.id,
    });
  }

  private async populateServiceAccountPrincipal(
    principal: Extract<
      AuthPrincipal,
      { kind: typeof AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT }
    >,
  ): Promise<void> {
    const row = await this.serviceAccountsService.findById(principal.sub);

    if (row == null) {
      this.globalCls.setUser({
        displayName: principal.sub,
        email: '',
        isDeleted: false,
        permissions: undefined,
        roles: [],
        uuid: principal.sub,
      });
      return;
    }

    const [permissions, roles] = await Promise.all([
      this.rolesService.getPermissionsForServiceAccount(row.id),
      this.rolesService.findRoleNamesByServiceAccountId(row.id),
    ]);

    this.globalCls.setUser({
      displayName: row.name,
      email: '',
      isDeleted: row.disabledAt != null,
      permissions,
      roles,
      uuid: row.id,
    });
  }
}

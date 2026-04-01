/**
 * @description After JWT validation, maps DB user + RBAC into {@link GlobalClsService} for the request.
 */

import { Injectable } from '@nestjs/common';
import type { JwtPayload } from '@openthrottle/nestjs-auth';
import {
  GlobalClsService,
  globalClsUserFromJwtLike,
} from '@openthrottle/nestjs-modules';
import { RolesService, UsersService } from '@openthrottle/nestjs-repositories';

@Injectable()
export class GlobalClsAuthHook {
  constructor(
    private readonly globalCls: GlobalClsService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  /**
   * @description Loads the user row and permissions when possible; otherwise falls back to JWT-only mapping.
   */
  async populateFromJwtPayload(payload: JwtPayload): Promise<void> {
    const row = await this.usersService.findById(payload.sub);

    if (row == null) {
      this.globalCls.setUser(globalClsUserFromJwtLike(payload));
      return;
    }

    const [permissions, roles] = await Promise.all([
      this.rolesService.getPermissionsForUser(row.id),
      this.rolesService.findRoleNamesByUserId(row.id),
    ]);

    this.globalCls.setUser({
      displayName: row.githubUsername,
      email: row.email ?? payload.email ?? '',
      isDeleted: row.disabledAt != null,
      permissions,
      roles,
      uuid: row.id,
    });
  }
}

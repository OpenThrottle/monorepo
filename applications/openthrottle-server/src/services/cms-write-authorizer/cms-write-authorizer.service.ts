/**
 * @description openthrottle-server's answer to the cms package's `CMS_WRITE_AUTHORIZER`: a
 * principal may write cms content when its database-backed permissions include `cms:write`
 * (the same lookup `GqlPermissionsGuard` uses, never the JWT's role claim). A user writer carries
 * their email so the cms package can resolve their profile.
 */

import { Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT } from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import { RolesService, UsersService } from '@openthrottle/nestjs-repositories';
import type {
  CmsWriteAuthorizer,
  CmsWriteDecision,
} from '@openthrottle/nestjs-repositories-cms';

import { getPermissionsForPrincipal } from '../../guards/guards.utils.ts';

@Injectable()
export class CmsWriteAuthorizerService implements CmsWriteAuthorizer {
  constructor(
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
  ) {}

  async authorize(principal: AuthPrincipal): Promise<CmsWriteDecision> {
    const permissions = await getPermissionsForPrincipal(
      this.rolesService,
      principal,
    );

    if (!permissions.includes(PERMISSIONS.CMS_WRITE)) {
      return {
        ok: false,
        reason: `Missing permission: ${PERMISSIONS.CMS_WRITE}`,
      };
    }

    if (principal.kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT) {
      return {
        ok: true,
        writer: { kind: 'service-account', serviceAccountId: principal.sub },
      };
    }

    const user = await this.usersService.findById(principal.sub);

    return {
      ok: true,
      writer: {
        email: user?.email ?? principal.email ?? null,
        kind: 'user',
        userId: principal.sub,
      },
    };
  }
}

/**
 * @description openthrottle-server's answer to the cms package's `CMS_WRITE_AUTHORIZER`: a
 * principal may write cms content when its database-backed permissions include `cms:write`
 * (the same lookup `GqlPermissionsGuard` uses, never the JWT's role claim). A user writer carries
 * their email so the cms package can resolve their profile.
 *
 * A user must also still be live: a soft-deleted (`deletedAt`) or disabled (`disabledAt`) user is
 * refused even while their JWT is unexpired, so a removed account can never create or restore a
 * cms profile. Their existing profile is left linked (a soft link, not an orphan sweep): user ids
 * are never reissued, so the link stays truthful and keeps their content attributable. See
 * databases/cms/README.md § profile identity.
 */

import { Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT } from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import type {
  CmsWriteAuthorizer,
  CmsWriteDecision,
} from '@openthrottle/nestjs-repositories-cms';
import {
  RolesRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';

import { getPermissionsForPrincipal } from '../../guards/guards.utils.ts';

@Injectable()
export class CmsWriteAuthorizerService implements CmsWriteAuthorizer {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async authorize(principal: AuthPrincipal): Promise<CmsWriteDecision> {
    const permissions = await getPermissionsForPrincipal(
      this.rolesRepository,
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

    // A soft-deleted row is excluded by TypeORM's `@DeleteDateColumn`, so it reads as missing.
    const user = await this.usersRepository.findOne({
      where: { id: principal.sub },
    });

    if (!user) {
      return {
        ok: false,
        reason: `This account no longer exists, so it cannot change cms content`,
      };
    }

    if (user.disabledAt != null) {
      return {
        ok: false,
        reason: `This account is disabled, so it cannot change cms content`,
      };
    }

    return {
      ok: true,
      writer: {
        email: user.email ?? principal.email ?? null,
        kind: 'user',
        userId: principal.sub,
      },
    };
  }
}

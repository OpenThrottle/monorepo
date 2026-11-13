import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  getAuthPrincipalFromRequest,
  getRequestFromExecutionContext,
} from '@openthrottle/nestjs-auth';

import { createCmsGraphqlError } from '../cms-graphql/cms-graphql.utils.ts';
import { CmsProfilesService } from '../cms-profiles/cms-profiles.service.ts';
import { CMS_WRITE_AUTHORIZER } from './cms-write-access.constants.ts';
import type { CmsWriteAuthorizer } from './cms-write-access.types.ts';

/**
 * @description Guards every cms mutation. Requires a signed-in principal, asks the host's
 * `CMS_WRITE_AUTHORIZER` whether it may write cms content (the host owns the permission model;
 * openthrottle-server checks `cms:write`), and for a user resolves (or creates) their cms profile
 * and puts it on the request as `cmsProfile`. With no authorizer registered every write is
 * refused: fail closed.
 * @public
 */
@Injectable()
export class CmsWriteGuard implements CanActivate {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly cmsProfilesService: CmsProfilesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getRequestFromExecutionContext(context);
    const principal = getAuthPrincipalFromRequest(request);

    if (!principal) {
      throw createCmsGraphqlError(
        'UNAUTHENTICATED',
        `Sign in to change cms content`,
      );
    }

    const authorizer = this.findAuthorizer();

    if (!authorizer) {
      throw createCmsGraphqlError(
        'FORBIDDEN',
        `cms writes are disabled: the host registers no ${CMS_WRITE_AUTHORIZER}`,
      );
    }

    const decision = await authorizer.authorize(principal);

    if (!decision.ok) {
      throw createCmsGraphqlError('FORBIDDEN', decision.reason);
    }

    if (decision.writer.kind === 'user' && request) {
      const profile = await this.cmsProfilesService.resolveForUser(
        decision.writer,
      );

      Reflect.set(request, 'cmsProfile', profile);
    }

    return true;
  }

  private findAuthorizer(): CmsWriteAuthorizer | null {
    try {
      const candidate: unknown = this.moduleRef.get(CMS_WRITE_AUTHORIZER, {
        strict: false,
      });

      return isCmsWriteAuthorizer(candidate) ? candidate : null;
    } catch {
      return null;
    }
  }
}

/**
 * @description Narrows a resolved provider to {@link CmsWriteAuthorizer}.
 */
function isCmsWriteAuthorizer(value: unknown): value is CmsWriteAuthorizer {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'authorize') === 'function'
  );
}

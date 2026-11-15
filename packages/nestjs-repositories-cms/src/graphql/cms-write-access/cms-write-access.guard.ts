import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { getRequestFromExecutionContext } from '@openthrottle/nestjs-auth';

import { createCmsGraphqlError } from '../cms-graphql/cms-graphql.utils.ts';
import { CmsProfilesService } from '../cms-profiles/cms-profiles.service.ts';
import { CmsWriteAccessService } from './cms-write-access.service.ts';

/**
 * @description Guards every cms mutation. Requires a signed-in principal, asks
 * `CmsWriteAccessService` (and through it the host's `CMS_WRITE_AUTHORIZER`; openthrottle-server
 * checks `cms:write`) whether it may write cms content, and for a user resolves (or creates)
 * their cms profile and puts it on the request as `cmsProfile`. With no authorizer registered
 * every write is refused: fail closed.
 * @public
 */
@Injectable()
export class CmsWriteGuard implements CanActivate {
  constructor(
    private readonly cmsWriteAccessService: CmsWriteAccessService,
    private readonly cmsProfilesService: CmsProfilesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getRequestFromExecutionContext(context);
    const access = await this.cmsWriteAccessService.authorize(request);

    if (!access.ok) {
      throw createCmsGraphqlError(access.code, access.reason);
    }

    if (access.writer.kind === 'user' && request) {
      const profile = await this.cmsProfilesService.resolveForUser(
        access.writer,
      );

      Reflect.set(request, 'cmsProfile', profile);
    }

    return true;
  }
}

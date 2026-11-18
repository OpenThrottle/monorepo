/**
 * @description Provides openthrottle-server's {@link CmsWriteAuthorizerService} under the cms
 * package's `CMS_WRITE_AUTHORIZER` token, which `CmsWriteGuard` resolves app-wide. Without this
 * module every cms mutation is refused.
 */

import { Module } from '@nestjs/common';
import { CMS_WRITE_AUTHORIZER } from '@openthrottle/nestjs-repositories-cms';
import {
  RolesModule,
  UsersModule,
} from '@openthrottle/nestjs-repositories-server';

import { CmsWriteAuthorizerService } from './cms-write-authorizer.service.ts';

@Module({
  exports: [CMS_WRITE_AUTHORIZER, CmsWriteAuthorizerService],
  imports: [RolesModule, UsersModule],
  providers: [
    CmsWriteAuthorizerService,
    { provide: CMS_WRITE_AUTHORIZER, useExisting: CmsWriteAuthorizerService },
  ],
})
export class CmsWriteAuthorizerModule {}

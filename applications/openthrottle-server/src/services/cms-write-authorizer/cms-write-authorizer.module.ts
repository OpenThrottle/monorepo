/**
 * @description Provides openthrottle-server's {@link CmsWriteAuthorizerService} under the cms
 * package's `CMS_WRITE_AUTHORIZER` token, which `CmsWriteGuard` resolves app-wide. Without this
 * module every cms mutation is refused.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { CMS_WRITE_AUTHORIZER } from '@openthrottle/nestjs-repositories-cms';

import { CmsWriteAuthorizerService } from './cms-write-authorizer.service.ts';

@Module({
  exports: [CMS_WRITE_AUTHORIZER, CmsWriteAuthorizerService],
  imports: [NestjsRepositoriesModule],
  providers: [
    CmsWriteAuthorizerService,
    { provide: CMS_WRITE_AUTHORIZER, useExisting: CmsWriteAuthorizerService },
  ],
})
export class CmsWriteAuthorizerModule {}

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { GitTextResolver } from './git-text.resolver.ts';
import { GitTextService } from './git-text.service.ts';

/**
 * @description The `gitTextDraft` query: branch, commit and PR text drafted from a plan's OT data.
 * NestjsRepositoriesModule supplies PlansService, TasksService and RolesService (for
 * GqlPermissionsGuard).
 */
@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, GitTextResolver, GitTextService],
})
export class GitTextGraphqlModule {}

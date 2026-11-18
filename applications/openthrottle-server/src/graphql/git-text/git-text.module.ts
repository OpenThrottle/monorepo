import { Module } from '@nestjs/common';
import {
  PlansModule,
  RolesModule,
  TasksModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { GitTextResolver } from './git-text.resolver.ts';
import { GitTextService } from './git-text.service.ts';

/**
 * @description The `gitTextDraft` query: branch, commit and PR text drafted from a plan's OT data.
 * The plans and tasks table modules supply PlansRepository and TasksRepository;
 * RolesModule supplies RolesRepository (for GqlPermissionsGuard).
 */
@Module({
  imports: [RolesModule, PlansModule, TasksModule],
  providers: [GqlPermissionsGuard, GitTextResolver, GitTextService],
})
export class GitTextGraphqlModule {}

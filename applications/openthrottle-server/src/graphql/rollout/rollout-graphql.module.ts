/**
 * @description GraphQL module for rollout feature flags. Registers RolloutResolver and
 * GqlPermissionsGuard. Imports RolloutFlagsModule (RolloutService) and NestjsRepositoriesModule
 * (RolesService, used by both RolloutService evaluation and the guard).
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { RolloutFlagsModule } from '@openthrottle/nestjs-rollout';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { RolloutResolver } from './rollout.resolver';

@Module({
  imports: [NestjsRepositoriesModule, RolloutFlagsModule],
  providers: [GqlPermissionsGuard, RolloutResolver],
})
export class RolloutGraphqlModule {}

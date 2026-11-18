/**
 * @description GraphQL module for rollout feature flags. Registers RolloutResolver and
 * GqlPermissionsGuard. Imports RolloutFlagsModule (RolloutService) and NestjsRepositoriesModule
 * (RolesRepository, used by both RolloutService evaluation and the guard).
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';
import { RolloutFlagsModule } from '@openthrottle/nestjs-rollout';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { RolloutResolver } from './rollout.resolver.ts';

@Module({
  imports: [RolesModule, LoggerModule, RolloutFlagsModule],
  providers: [GqlPermissionsGuard, RolloutResolver],
})
export class RolloutGraphqlModule {}

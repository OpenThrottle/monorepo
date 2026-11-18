/**
 * @description GraphQL module that registers UsersResolver and imports NestjsRepositoriesModule for UsersRepository.
 */

import { Module } from '@nestjs/common';
import {
  RolesModule,
  UsersModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { UsersResolver } from './users.resolver.ts';

@Module({
  imports: [RolesModule, UsersModule],
  providers: [GqlPermissionsGuard, UsersResolver],
})
export class UsersGraphqlModule {}

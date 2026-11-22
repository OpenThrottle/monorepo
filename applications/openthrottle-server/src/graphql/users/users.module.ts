/**
 * @description GraphQL module that registers UsersResolver and imports UsersModule for UsersRepository, OAuthModule for revoking a disabled user's grants, and RolesModule for the permissions guard.
 */

import { Module } from '@nestjs/common';
import {
  OAuthModule,
  RolesModule,
  UsersModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { UsersResolver } from './users.resolver.ts';

@Module({
  imports: [OAuthModule, RolesModule, UsersModule],
  providers: [GqlPermissionsGuard, UsersResolver],
})
export class UsersGraphqlModule {}

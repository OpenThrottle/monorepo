/**
 * @description GraphQL module that registers UsersResolver and imports NestjsRepositoriesModule for UsersService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { UsersResolver } from './users.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, UsersResolver],
})
export class UsersGraphqlModule {}

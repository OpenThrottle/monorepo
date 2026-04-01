/**
 * @description GraphQL module for roles and permissions. Registers RolesResolver and GqlPermissionsGuard.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { RolesResolver } from './roles.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, RolesResolver],
})
export class RolesGraphqlModule {}

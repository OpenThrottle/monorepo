/**
 * @description GraphQL module for service account admin (human JWT + users:* permissions).
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { ServiceAccountsResolver } from './service-accounts.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, ServiceAccountsResolver],
})
export class ServiceAccountsGraphqlModule {}

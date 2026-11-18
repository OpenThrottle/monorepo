/**
 * @description GraphQL module for service account admin (human JWT + users:* permissions).
 */

import { Module } from '@nestjs/common';
import {
  RolesModule,
  ServiceAccountCredentialsModule,
  ServiceAccountsModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { ServiceAccountsResolver } from './service-accounts.resolver.ts';

@Module({
  imports: [
    RolesModule,
    ServiceAccountCredentialsModule,
    ServiceAccountsModule,
  ],
  providers: [GqlPermissionsGuard, ServiceAccountsResolver],
})
export class ServiceAccountsGraphqlModule {}

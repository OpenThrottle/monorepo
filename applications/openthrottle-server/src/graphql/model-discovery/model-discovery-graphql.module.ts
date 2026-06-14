/**
 * @description GraphQL module for local model discovery. Registers ModelDiscoveryResolver and
 * imports NestjsModelDiscoveryModule (the cached wrapper service over the discovery core).
 */

import { Module } from '@nestjs/common';
import { NestjsModelDiscoveryModule } from '@openthrottle/nestjs-model-discovery';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { ModelDiscoveryResolver } from './model-discovery.resolver';

@Module({
  imports: [NestjsModelDiscoveryModule, NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, ModelDiscoveryResolver],
})
export class ModelDiscoveryGraphqlModule {}

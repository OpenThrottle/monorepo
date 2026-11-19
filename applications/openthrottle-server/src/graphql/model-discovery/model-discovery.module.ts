/**
 * @description GraphQL module for local model discovery. Registers ModelDiscoveryResolver and
 * imports NestjsModelDiscoveryModule (the cached wrapper service over the discovery core).
 */

import { Module } from '@nestjs/common';
import { NestjsModelDiscoveryModule } from '@openthrottle/nestjs-model-discovery';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { ModelDiscoveryResolver } from './model-discovery.resolver.ts';

@Module({
  imports: [RolesModule, NestjsModelDiscoveryModule],
  providers: [GqlPermissionsGuard, ModelDiscoveryResolver],
})
export class ModelDiscoveryGraphqlModule {}

/**
 * @description GraphQL module for the remote model catalog. Registers RemoteModelsResolver and
 * imports NestjsModelDiscoveryModule, which provides both the local discovery service and the
 * cached remote-catalog wrapper.
 */

import { Module } from '@nestjs/common';
import { NestjsModelDiscoveryModule } from '@openthrottle/nestjs-model-discovery';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { RemoteModelsResolver } from './remote-models.resolver';

@Module({
  imports: [NestjsModelDiscoveryModule, NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, RemoteModelsResolver],
})
export class RemoteModelsGraphqlModule {}

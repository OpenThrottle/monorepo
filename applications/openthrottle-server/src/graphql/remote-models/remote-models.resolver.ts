/**
 * @description GraphQL resolver for the remote model catalog. The discoverRemoteModels query
 * returns the cached snapshot from the injected NestjsRemoteModelsService (soft ~1h TTL) — it does
 * NOT fetch the gateway per request. An unreachable gateway degrades to an empty catalog rather
 * than an error, so a page load can never be broken by it.
 *
 * The gateway API key never crosses this boundary: only the derived `configured` boolean does.
 */

import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { NestjsRemoteModelsService } from '@openthrottle/nestjs-model-discovery';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import {
  DiscoverRemoteModelsResult,
  RemoteModelObject,
} from './remote-models.object';

@Resolver()
@UseGuards(GqlPermissionsGuard)
export class RemoteModelsResolver {
  constructor(private readonly remoteModels: NestjsRemoteModelsService) {}

  @Query(() => DiscoverRemoteModelsResult, {
    description: `List the models a remote gateway (OpenRouter) can route to. Returns a cached snapshot (~1h TTL); does not call the gateway per request. Returns an empty list rather than an error when the gateway is unreachable or unconfigured.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async discoverRemoteModels(): Promise<DiscoverRemoteModelsResult> {
    const { catalog, configured } = await this.remoteModels.catalog();
    const models: RemoteModelObject[] = catalog.models.map((model) => ({
      contextLength: model.contextLength,
      id: model.id,
      name: model.name,
      provider: model.provider,
    }));

    return {
      configured,
      fetchedAt: catalog.fetchedAt,
      models,
      provider: catalog.provider,
      totalCount: models.length,
    };
  }
}

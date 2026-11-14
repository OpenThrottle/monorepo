/**
 * @description GraphQL resolver for local model discovery. The discoverLocalModels query returns
 * the cached snapshot from the injected NestjsModelDiscoveryService (60s in-process TTL) — it does
 * NOT trigger a live scan per request. baseUrls reflect the server's network vantage point. The
 * query and its object-typed `endpoints` field both carry a 60s PRIVATE cache hint, so Apollo's
 * response cache serves a repeat read and the response carries `cache-control: max-age=60, private`.
 */

import { UseGuards } from '@nestjs/common';
import { Info, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { setCacheHint } from '@openthrottle/nestjs-graphql';
import { NestjsModelDiscoveryService } from '@openthrottle/nestjs-model-discovery';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import type { GraphQLResolveInfo } from 'graphql';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { MODEL_DISCOVERY_CACHE_HINT } from './model-discovery.constants.ts';
import {
  DiscoverLocalModelsResult,
  ModelEndpointObject,
} from './model-discovery.object.ts';

@Resolver(() => DiscoverLocalModelsResult)
@UseGuards(GqlPermissionsGuard)
export class ModelDiscoveryResolver {
  constructor(private readonly modelDiscovery: NestjsModelDiscoveryService) {}

  @Query(() => DiscoverLocalModelsResult, {
    description: `Discover locally-running OpenAI-compatible model servers (Ollama-primary) and the models they serve. Returns a cached snapshot (60s TTL); does not scan per request.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async discoverLocalModels(
    @Info() info: GraphQLResolveInfo,
  ): Promise<DiscoverLocalModelsResult> {
    setCacheHint(info, MODEL_DISCOVERY_CACHE_HINT);
    const result = await this.modelDiscovery.discover();
    const endpoints: ModelEndpointObject[] = result.endpoints.map(
      (endpoint) => ({
        baseUrl: endpoint.baseUrl,
        host: endpoint.host,
        models: [...endpoint.models],
        port: endpoint.port,
        provider: endpoint.provider,
      }),
    );

    return {
      endpoints,
      scannedAt: result.scannedAt,
      scannedHosts: [...result.scannedHosts],
      totalCount: endpoints.length,
    };
  }

  /**
   * Pass-through for `endpoints` whose only job is the cache hint: an
   * object-typed field defaults to `maxAge: 0`, which would otherwise make the
   * whole operation uncacheable.
   */
  @ResolveField(() => [ModelEndpointObject])
  endpoints(
    @Parent() result: DiscoverLocalModelsResult,
    @Info() info: GraphQLResolveInfo,
  ): ModelEndpointObject[] {
    setCacheHint(info, MODEL_DISCOVERY_CACHE_HINT);
    return result.endpoints;
  }
}

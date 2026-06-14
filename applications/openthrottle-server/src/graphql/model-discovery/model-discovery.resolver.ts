/**
 * @description GraphQL resolver for local model discovery. The discoverLocalModels query returns
 * the cached snapshot from the injected NestjsModelDiscoveryService (60s in-process TTL) — it does
 * NOT trigger a live scan per request. baseUrls reflect the server's network vantage point.
 */

import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { NestjsModelDiscoveryService } from '@openthrottle/nestjs-model-discovery';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import {
  DiscoverLocalModelsResult,
  ModelEndpointObject,
} from './model-discovery.object';

@Resolver()
@UseGuards(GqlPermissionsGuard)
export class ModelDiscoveryResolver {
  constructor(private readonly modelDiscovery: NestjsModelDiscoveryService) {}

  @Query(() => DiscoverLocalModelsResult, {
    description: `Discover locally-running OpenAI-compatible model servers (Ollama-primary) and the models they serve. Returns a cached snapshot (60s TTL); does not scan per request.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async discoverLocalModels(): Promise<DiscoverLocalModelsResult> {
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
}

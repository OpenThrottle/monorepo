/**
 * @description Adds `embeddings` to `serverHealth` as a field resolver, so the coverage queries
 * run only when a client selects it (MCP `health` does; Ralph's preflight and REST /health
 * do not).
 */

import { ResolveField, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';

import { ServerHealthObject } from '../server-health.object.ts';
import { EmbeddingsHealthObject } from './embeddings-health.object.ts';
import { EmbeddingsHealthService } from './embeddings-health.service.ts';

@Public()
@Resolver(() => ServerHealthObject)
export class EmbeddingsHealthResolver {
  constructor(
    private readonly embeddingsHealth: EmbeddingsHealthService,
    private readonly logger: LoggerService,
  ) {}

  @ResolveField('embeddings', () => EmbeddingsHealthObject, {
    description: `Semantic-search embeddings: embedder state, per-table coverage, stale rows and queue backlog. Computed on demand (hashes every source row). Null when it cannot be computed (e.g. the database is unreachable) — that never fails the rest of serverHealth.`,
    nullable: true,
  })
  async embeddings(): Promise<EmbeddingsHealthObject | null> {
    try {
      return await this.embeddingsHealth.getEmbeddingsHealth();
    } catch (error: unknown) {
      this.logger.warn(
        `Embeddings health unavailable: ${error instanceof Error ? error.message : String(error)}`,
        EmbeddingsHealthResolver.name,
      );

      return null;
    }
  }
}

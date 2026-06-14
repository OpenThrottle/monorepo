/**
 * @description GraphQL ObjectTypes for local model discovery: a discovered model-server endpoint
 * and a ListResult-style envelope ({ endpoints, totalCount } plus scannedHosts/scannedAt). Backs
 * the discoverLocalModels query; consumed via the openthrottle-mcp discover_local_models tool.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ModelEndpointObject {
  @Field(() => String, {
    description: `OpenAI-compatible /v1 base URL, e.g. http://localhost:11434/v1. Reflects the server's network vantage point.`,
  })
  baseUrl!: string;

  @Field(() => String, {
    description: `Host the endpoint was reached on, e.g. localhost or host.docker.internal.`,
  })
  host!: string;

  @Field(() => [String], {
    description: `Sorted, de-duplicated model ids advertised by /v1/models (empty when the server is idle).`,
  })
  models!: string[];

  @Field(() => Int, { description: `Port the endpoint was reached on.` })
  port!: number;

  @Field(() => String, {
    description: `Best-effort provider label (ollama, lmstudio) or null when not fingerprinted.`,
    nullable: true,
  })
  provider!: string | null;
}

@ObjectType()
export class DiscoverLocalModelsResult {
  @Field(() => [ModelEndpointObject], {
    description: `De-duplicated reachable endpoints, stably sorted by (host, port).`,
  })
  endpoints!: ModelEndpointObject[];

  @Field(() => String, {
    description: `ISO-8601 timestamp of when this snapshot was scanned.`,
  })
  scannedAt!: string;

  @Field(() => [String], {
    description: `Hosts probed during this scan, in resolution order.`,
  })
  scannedHosts!: string[];

  @Field(() => Int, { description: `Number of discovered endpoints.` })
  totalCount!: number;
}

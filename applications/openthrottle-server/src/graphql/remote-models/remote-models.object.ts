/**
 * @description GraphQL ObjectTypes for the remote model catalog: one routable model published by a
 * hosted gateway, and a ListResult-style envelope ({ models, totalCount } plus provider/fetchedAt/
 * configured). Backs the discoverRemoteModels query — the remote sibling of discoverLocalModels.
 *
 * The gateway API key is deliberately absent from this schema. `configured` is the ONLY fact a
 * client ever learns about it.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RemoteModelObject {
  @Field(() => Int, {
    description: `Maximum context window in tokens, as advertised by the provider.`,
  })
  contextLength!: number;

  @Field(() => String, {
    description: `Provider-scoped model slug, e.g. anthropic/claude-sonnet-5.`,
  })
  id!: string;

  @Field(() => String, {
    description: `Human-readable label, e.g. "Anthropic: Claude Sonnet 5".`,
  })
  name!: string;

  @Field(() => String, {
    description: `Remote catalog that published this model (openrouter).`,
  })
  provider!: string;
}

@ObjectType()
export class DiscoverRemoteModelsResult {
  @Field(() => Boolean, {
    description: `True when an operator API key is configured, so the provider can serve chat turns. False means the catalog may still list models (OpenRouter serves it unauthenticated) but no turn can be started. The key itself is never exposed.`,
  })
  configured!: boolean;

  @Field(() => String, {
    description: `ISO-8601 timestamp of when this catalog snapshot was fetched.`,
  })
  fetchedAt!: string;

  @Field(() => [RemoteModelObject], {
    description: `Models sorted by id and de-duplicated. Empty when the gateway is unreachable — never an error.`,
  })
  models!: RemoteModelObject[];

  @Field(() => String, {
    description: `Remote catalog provider id (openrouter).`,
  })
  provider!: string;

  @Field(() => Int, { description: `Number of models in the catalog.` })
  totalCount!: number;
}

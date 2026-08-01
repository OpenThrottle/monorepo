/**
 * @description GraphQL ObjectType for a curated MCP connector catalog entry (static seed).
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { McpConnectorCatalogEntry } from './mcp-connector-catalog';

@ObjectType()
export class McpConnectorObject implements McpConnectorCatalogEntry {
  @Field(() => String, {
    description: `Auth mechanism: api_token or oauth.`,
  })
  authType!: McpConnectorCatalogEntry['authType'];

  @Field(() => String)
  category!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  docsUrl!: string;

  @Field(() => String, {
    description: `Remote endpoint URL, or null for local-stdio / directory-brokered connectors.`,
    nullable: true,
  })
  endpointUrl!: string | null;

  @Field(() => String, {
    description: `Icon hint slug for the UI to resolve.`,
  })
  iconHint!: string;

  @Field(() => ID, {
    description: `Stable catalog key; referenced by a connection's connectorKey.`,
  })
  key!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `Source registry/host: anthropic-directory, mcp-registry, or vendor-remote.`,
  })
  provider!: McpConnectorCatalogEntry['provider'];

  @Field(() => String, {
    description: `Transport: local-stdio, remote-http, or remote-sse.`,
  })
  transport!: McpConnectorCatalogEntry['transport'];
}

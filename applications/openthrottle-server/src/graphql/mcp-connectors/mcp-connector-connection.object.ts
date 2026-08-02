/**
 * @description GraphQL ObjectType for a user's MCP connector connection (never exposes the credential hash).
 */

import type { McpConnectorConnectionData } from '@openthrottle/nestjs-repositories';
import { Field, ID, ObjectType } from '@nestjs/graphql';

/** Public connection fields (excludes credentialSecretHash). */
type PublicMcpConnectorConnectionData = Omit<
  McpConnectorConnectionData,
  'credentialSecretHash'
>;

@ObjectType()
export class McpConnectorConnectionObject implements PublicMcpConnectorConnectionData {
  @Field(() => String, {
    description: `Auth mechanism recorded at connect time: api_token or oauth.`,
  })
  authType!: McpConnectorConnectionData['authType'];

  @Field(() => Date)
  connectedAt!: Date;

  @Field(() => ID, {
    description: `Catalog key this connection is for.`,
  })
  connectorKey!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  credentialLabel!: string | null;

  @Field(() => String, {
    description: `Masked credential hint for display (api_token only); never the raw secret.`,
    nullable: true,
  })
  credentialPrefix!: string | null;

  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => ID)
  id!: string;

  @Field(() => Date, { nullable: true })
  lastUsedAt!: Date | null;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => ID)
  userId!: string;
}

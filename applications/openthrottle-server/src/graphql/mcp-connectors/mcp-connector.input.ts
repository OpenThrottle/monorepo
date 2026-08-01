/**
 * @description GraphQL input types for MCP connector connect/enable mutations.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class ConnectMcpConnectorInput {
  @Field(() => String, {
    description: `API token for api_token connectors; ignored for oauth. Never persisted raw — stored as a bcrypt hash + masked hint.`,
    nullable: true,
  })
  apiToken!: string | null;

  @Field(() => ID, {
    description: `Catalog key of the connector to connect.`,
  })
  connectorKey!: string;

  @Field(() => String, {
    description: `Optional label for the credential.`,
    nullable: true,
  })
  label!: string | null;
}

@InputType()
export class SetMcpConnectorEnabledInput {
  @Field(() => ID)
  connectorKey!: string;

  @Field(() => Boolean)
  enabled!: boolean;
}

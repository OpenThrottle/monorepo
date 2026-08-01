/**
 * @description Result wrapper for MCP connector connect/enable mutations.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { McpConnectorConnectionObject } from './mcp-connector-connection.object';

@ObjectType()
export class McpConnectorConnectionResultObject {
  @Field(() => McpConnectorConnectionObject, {
    description: `The connection after the mutation (credential hash is never returned).`,
  })
  connection!: McpConnectorConnectionObject;
}

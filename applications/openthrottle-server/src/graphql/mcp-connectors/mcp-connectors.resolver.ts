/**
 * @description User-scoped GraphQL for the curated MCP connectors catalog + a
 * user's connections: browse the catalog, connect (store a masked credential),
 * enable/disable, disconnect. No agent-run wiring (follow-up plan).
 */

import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import type { McpConnectorConnection } from '@openthrottle/nestjs-repositories';
import { McpConnectorsService } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import {
  MCP_CONNECTOR_CATALOG,
  findMcpConnector,
} from './mcp-connector-catalog';
import { McpConnectorConnectionResultObject } from './mcp-connector-connection-result.object';
import { McpConnectorConnectionObject } from './mcp-connector-connection.object';
import { McpConnectorObject } from './mcp-connector.object';
import {
  ConnectMcpConnectorInput,
  SetMcpConnectorEnabledInput,
} from './mcp-connector.input';

const toConnectionObject = (
  connection: McpConnectorConnection,
): McpConnectorConnectionObject => ({
  authType: connection.authType,
  connectedAt: connection.connectedAt,
  connectorKey: connection.connectorKey,
  createdAt: connection.createdAt,
  credentialLabel: connection.credentialLabel,
  credentialPrefix: connection.credentialPrefix,
  enabled: connection.enabled,
  id: connection.id,
  lastUsedAt: connection.lastUsedAt,
  updatedAt: connection.updatedAt,
  userId: connection.userId,
});

@Resolver(() => McpConnectorObject)
@UseGuards(GqlPermissionsGuard)
export class McpConnectorsResolver {
  constructor(private readonly mcpConnectorsService: McpConnectorsService) {}

  @Query(() => [McpConnectorObject], {
    description: `The curated MCP connector catalog (static server-side seed).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async mcpConnectors(): Promise<McpConnectorObject[]> {
    return [...MCP_CONNECTOR_CATALOG];
  }

  @Query(() => [McpConnectorConnectionObject], {
    description: `The authenticated user's MCP connector connections.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async mcpConnectorConnections(
    @CurrentUser('sub') userId: string,
  ): Promise<McpConnectorConnectionObject[]> {
    const connections =
      await this.mcpConnectorsService.findConnectionsForUser(userId);
    return connections.map(toConnectionObject);
  }

  @Mutation(() => McpConnectorConnectionResultObject, {
    description: `Connect (or re-connect) a catalog connector for the authenticated user. For api_token connectors the token is stored as a bcrypt hash + masked hint; the raw token is never persisted.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async connectMcpConnector(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => ConnectMcpConnectorInput })
    input: ConnectMcpConnectorInput,
  ): Promise<McpConnectorConnectionResultObject> {
    const entry = findMcpConnector(input.connectorKey);
    if (!entry) {
      throw new BadRequestException(
        `Unknown MCP connector: ${input.connectorKey}`,
      );
    }
    const connection = await this.mcpConnectorsService.connect({
      apiToken: input.apiToken,
      authType: entry.authType,
      connectorKey: entry.key,
      label: input.label,
      userId,
    });
    return { connection: toConnectionObject(connection) };
  }

  @Mutation(() => McpConnectorConnectionResultObject, {
    description: `Enable or disable the authenticated user's connection for a connector.`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async setMcpConnectorEnabled(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => SetMcpConnectorEnabledInput })
    input: SetMcpConnectorEnabledInput,
  ): Promise<McpConnectorConnectionResultObject | null> {
    const connection = await this.mcpConnectorsService.setEnabled(
      userId,
      input.connectorKey,
      input.enabled,
    );
    if (!connection) {
      return null;
    }
    return { connection: toConnectionObject(connection) };
  }

  @Mutation(() => Boolean, {
    description: `Disconnect the authenticated user's connection for a connector. Returns true when a connection was removed.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async disconnectMcpConnector(
    @CurrentUser('sub') userId: string,
    @Args('connectorKey', { type: () => ID }) connectorKey: string,
  ): Promise<boolean> {
    return this.mcpConnectorsService.disconnect(userId, connectorKey);
  }
}

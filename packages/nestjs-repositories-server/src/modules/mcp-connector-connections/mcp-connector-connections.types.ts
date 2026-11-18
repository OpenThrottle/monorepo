import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { McpConnectorConnection } from './mcp-connector-connection.entity.ts';
import type { MCP_CONNECTOR_AUTH_TYPES } from './mcp-connector-connections.constants.ts';
import type { McpConnectorConnectionsRepository } from './mcp-connector-connections.repository.ts';

/**
 * Auth mechanism for an MCP connector connection.
 * @public
 */
export type McpConnectorAuthType = (typeof MCP_CONNECTOR_AUTH_TYPES)[number];

/**
 * Scalar/column fields of {@link McpConnectorConnection} (no relations).
 * @public
 */
export type McpConnectorConnectionData = Pick<
  McpConnectorConnection,
  | 'authType'
  | 'connectedAt'
  | 'connectorKey'
  | 'createdAt'
  | 'credentialLabel'
  | 'credentialPrefix'
  | 'credentialSecretHash'
  | 'enabled'
  | 'id'
  | 'lastUsedAt'
  | 'updatedAt'
  | 'userId'
>;

/**
 * Input for {@link McpConnectorConnectionsRepository.connect}.
 * @public
 */
export interface ConnectMcpConnectorInput {
  readonly apiToken: string | null | undefined;
  readonly authType: McpConnectorAuthType;
  readonly connectorKey: string;
  readonly label: string | null | undefined;
  readonly userId: string;
}

/**
 * @description A {@link McpConnectorConnectionsRepository} mock: every inherited
 * `BaseRepository` method plus the connection ones.
 * @public
 */
export interface McpConnectorConnectionsRepositoryMock extends BaseRepositoryMock<
  McpConnectorConnection,
  CreateModelInput<McpConnectorConnection>
> {
  readonly connect: Mock<McpConnectorConnectionsRepository['connect']>;
  readonly disconnect: Mock<McpConnectorConnectionsRepository['disconnect']>;
  readonly findConnection: Mock<
    McpConnectorConnectionsRepository['findConnection']
  >;
  readonly findConnectionsForUser: Mock<
    McpConnectorConnectionsRepository['findConnectionsForUser']
  >;
  readonly setEnabled: Mock<McpConnectorConnectionsRepository['setEnabled']>;
}

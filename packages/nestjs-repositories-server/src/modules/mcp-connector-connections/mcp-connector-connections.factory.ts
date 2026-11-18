/**
 * @description Fishery factory for {@link McpConnectorConnection}. Use in tests to build mock
 * connection rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { McpConnectorConnection } from './mcp-connector-connection.entity.ts';

/**
 * @description Column-only shape for building `mcp_connector_connections` test data.
 * @public
 */
export type McpConnectorConnectionFactoryData = Pick<
  McpConnectorConnection,
  | 'authType'
  | 'connectedAt'
  | 'connectorKey'
  | 'createdAt'
  | 'credentialLabel'
  | 'credentialPrefix'
  | 'credentialSecretHash'
  | 'deletedAt'
  | 'enabled'
  | 'id'
  | 'lastUsedAt'
  | 'updatedAt'
  | 'userId'
>;

/**
 * @description Builds McpConnectorConnection-shaped plain objects: a live, enabled oauth
 * connection by default. Override any field via `.build({ ... })`.
 * @public
 */
export const mcpConnectorConnectionsFactory =
  Factory.define<McpConnectorConnectionFactoryData>(() => ({
    authType: 'oauth',
    connectedAt: faker.date.past(),
    connectorKey: faker.helpers.arrayElement(['github', 'linear', 'stripe']),
    createdAt: faker.date.past(),
    credentialLabel: null,
    credentialPrefix: null,
    credentialSecretHash: null,
    deletedAt: null,
    enabled: true,
    id: faker.string.uuid(),
    lastUsedAt: null,
    updatedAt: faker.date.recent(),
    userId: faker.string.uuid(),
  }));

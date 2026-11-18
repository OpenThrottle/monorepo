import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { McpConnectorConnection } from './mcp-connector-connection.entity.ts';
import type { McpConnectorConnectionsRepositoryMock } from './mcp-connector-connections.types.ts';

/**
 * @description Builds a {@link McpConnectorConnectionsRepositoryMock} that starts as an empty
 * `mcp_connector_connections` table (see `createBaseRepositoryMock`): no connections, and
 * `setEnabled` / `disconnect` find nothing to change. `connect` rejects until a test stubs it,
 * since an invented row would hide a missing stub. Provide it in place of
 * `McpConnectorConnectionsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createMcpConnectorConnectionsRepositoryMock(): McpConnectorConnectionsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      McpConnectorConnection,
      CreateModelInput<McpConnectorConnection>
    >('mcp_connector_connections'),
    connect: vi.fn(() => {
      return Promise.reject(
        new Error(
          'mcp_connector_connections.connect is not stubbed in this test',
        ),
      );
    }),
    disconnect: vi.fn(async () => {
      return false;
    }),
    findConnection: vi.fn(async () => {
      return null;
    }),
    findConnectionsForUser: vi.fn(async () => {
      return [];
    }),
    setEnabled: vi.fn(async () => {
      return null;
    }),
  };
}

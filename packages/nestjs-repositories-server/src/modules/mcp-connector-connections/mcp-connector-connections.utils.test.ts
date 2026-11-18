import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createMcpConnectorConnectionsRepositoryMock } from './mcp-connector-connections.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('createMcpConnectorConnectionsRepositoryMock', () => {
  it('starts as an empty mcp_connector_connections table', async () => {
    const repository = createMcpConnectorConnectionsRepositoryMock();

    await expect(repository.findConnectionsForUser(userId)).resolves.toEqual(
      [],
    );
    await expect(
      repository.findConnection(userId, 'github'),
    ).resolves.toBeNull();
    await expect(
      repository.setEnabled(userId, 'github', false),
    ).resolves.toBeNull();
    await expect(repository.disconnect(userId, 'github')).resolves.toBe(false);
  });

  it('rejects connect until a test stubs it', async () => {
    const repository = createMcpConnectorConnectionsRepositoryMock();

    await expect(
      repository.connect({
        apiToken: null,
        authType: 'oauth',
        connectorKey: 'github',
        label: null,
        userId,
      }),
    ).rejects.toThrow(
      'mcp_connector_connections.connect is not stubbed in this test',
    );
  });

  it('names the mcp_connector_connections table in inherited not-found errors', async () => {
    const repository = createMcpConnectorConnectionsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'mcp_connector_connections record with ID "a" not found',
    );
  });
});

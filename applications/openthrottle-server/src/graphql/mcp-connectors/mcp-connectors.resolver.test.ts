import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  McpConnectorConnectionsRepository,
  RolesRepository,
} from '@openthrottle/nestjs-repositories-server';
import type { McpConnectorConnectionsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createMcpConnectorConnectionsRepositoryMock,
  createRolesRepositoryMock,
  mcpConnectorConnectionsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, test } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { McpConnectorsResolver } from './mcp-connectors.resolver.ts';

const userId = 'user-id';

const mockConnection = mcpConnectorConnectionsFactory.build({
  authType: 'api_token',
  connectorKey: 'stripe',
  credentialLabel: 'prod',
  credentialPrefix: 'sk_l…cdef',
  credentialSecretHash: 'hashed-secret',
  userId,
});

describe('McpConnectorsResolver', () => {
  let resolver: McpConnectorsResolver;
  let service: McpConnectorConnectionsRepositoryMock;

  beforeEach(async () => {
    service = createMcpConnectorConnectionsRepositoryMock();
    const app = await Test.createTestingModule({
      providers: [
        McpConnectorsResolver,
        { provide: McpConnectorConnectionsRepository, useValue: service },
        { provide: RolesRepository, useValue: createRolesRepositoryMock() },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get(McpConnectorsResolver);
  });

  describe('mcpConnectors', () => {
    test('returns the curated catalog', async () => {
      const result = await resolver.mcpConnectors();
      expect(result).toHaveLength(10);
      expect(result.map((entry) => entry.key)).toContain('github');
    });
  });

  describe('mcpConnectorConnections', () => {
    test('maps connections without exposing the secret hash', async () => {
      service.findConnectionsForUser.mockResolvedValue([mockConnection]);

      const result = await resolver.mcpConnectorConnections(userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.credentialPrefix).toBe('sk_l…cdef');
      expect(result[0]).not.toHaveProperty('credentialSecretHash');
    });
  });

  describe('connectMcpConnector', () => {
    test('derives auth type from the catalog and returns the wrapped connection', async () => {
      service.connect.mockResolvedValue(mockConnection);

      const result = await resolver.connectMcpConnector(userId, {
        apiToken: 'sk_live_0123456789abcdef',
        connectorKey: 'stripe',
        label: 'prod',
      });

      expect(service.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          authType: 'api_token',
          connectorKey: 'stripe',
          userId,
        }),
      );
      expect(result.connection.connectorKey).toBe('stripe');
      expect(result.connection).not.toHaveProperty('credentialSecretHash');
    });

    test('rejects an unknown connector key', async () => {
      await expect(
        resolver.connectMcpConnector(userId, {
          apiToken: null,
          connectorKey: 'nope',
          label: null,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(service.connect).not.toHaveBeenCalled();
    });
  });

  describe('setMcpConnectorEnabled', () => {
    test('returns null when the user has no connection', async () => {
      service.setEnabled.mockResolvedValue(null);
      await expect(
        resolver.setMcpConnectorEnabled(userId, {
          connectorKey: 'stripe',
          enabled: false,
        }),
      ).resolves.toBeNull();
    });

    test('wraps the updated connection', async () => {
      service.setEnabled.mockResolvedValue({
        ...mockConnection,
        enabled: false,
      });
      const result = await resolver.setMcpConnectorEnabled(userId, {
        connectorKey: 'stripe',
        enabled: false,
      });
      expect(result?.connection.enabled).toBe(false);
    });
  });

  describe('disconnectMcpConnector', () => {
    test('delegates to the repository', async () => {
      service.disconnect.mockResolvedValue(true);
      await expect(
        resolver.disconnectMcpConnector(userId, 'stripe'),
      ).resolves.toBe(true);
      expect(service.disconnect).toHaveBeenCalledWith(userId, 'stripe');
    });
  });
});

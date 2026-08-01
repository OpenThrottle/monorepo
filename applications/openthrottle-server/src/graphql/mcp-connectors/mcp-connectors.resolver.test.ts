import type { McpConnectorConnection } from '@openthrottle/nestjs-repositories';
import {
  McpConnectorsService,
  RolesService,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { McpConnectorsResolver } from './mcp-connectors.resolver';

const userId = 'user-id';

const mockConnection: McpConnectorConnection = {
  authType: 'api_token',
  connectedAt: new Date('2026-02-02T10:00:00.000Z'),
  connectorKey: 'stripe',
  createdAt: new Date('2026-02-02T10:00:00.000Z'),
  credentialLabel: 'prod',
  credentialPrefix: 'sk_l…cdef',
  credentialSecretHash: 'hashed-secret',
  enabled: true,
  id: '22222222-2222-4222-8222-222222222222',
  lastUsedAt: null,
  updatedAt: new Date('2026-02-02T10:00:00.000Z'),
  userId,
};

describe('McpConnectorsResolver', () => {
  let resolver: McpConnectorsResolver;
  let service: McpConnectorsService;

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      providers: [
        McpConnectorsResolver,
        {
          provide: McpConnectorsService,
          useValue: createMock<McpConnectorsService>(),
        },
        { provide: RolesService, useValue: createMock<RolesService>() },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get(McpConnectorsResolver);
    service = app.get(McpConnectorsService);
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
      vi.mocked(service.findConnectionsForUser).mockResolvedValue([
        mockConnection,
      ]);

      const result = await resolver.mcpConnectorConnections(userId);

      expect(result).toHaveLength(1);
      expect(result[0]?.credentialPrefix).toBe('sk_l…cdef');
      expect(result[0]).not.toHaveProperty('credentialSecretHash');
    });
  });

  describe('connectMcpConnector', () => {
    test('derives auth type from the catalog and returns the wrapped connection', async () => {
      vi.mocked(service.connect).mockResolvedValue(mockConnection);

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
      vi.mocked(service.setEnabled).mockResolvedValue(null);
      await expect(
        resolver.setMcpConnectorEnabled(userId, {
          connectorKey: 'stripe',
          enabled: false,
        }),
      ).resolves.toBeNull();
    });

    test('wraps the updated connection', async () => {
      vi.mocked(service.setEnabled).mockResolvedValue({
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
    test('delegates to the service', async () => {
      vi.mocked(service.disconnect).mockResolvedValue(true);
      await expect(
        resolver.disconnectMcpConnector(userId, 'stripe'),
      ).resolves.toBe(true);
      expect(service.disconnect).toHaveBeenCalledWith(userId, 'stripe');
    });
  });
});

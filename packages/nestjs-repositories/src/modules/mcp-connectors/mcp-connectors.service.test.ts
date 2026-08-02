import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import * as bcrypt from 'bcrypt';
import { McpConnectorConnection } from './mcp-connector-connection.entity';
import { McpConnectorsService } from './mcp-connectors.service';

const userId = '11111111-1111-4111-8111-111111111111';
const connectionId = '22222222-2222-4222-8222-222222222222';

describe('McpConnectorsService', () => {
  type ConnectionRepo = {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  let service: McpConnectorsService;
  let connectionRepository: ConnectionRepo;

  beforeEach(async () => {
    connectionRepository = {
      create: vi.fn((data: Partial<McpConnectorConnection>) => data),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (entity: McpConnectorConnection) => ({
        ...entity,
        createdAt: new Date(),
        id: connectionId,
        updatedAt: new Date(),
      })),
    };

    const app = await Test.createTestingModule({
      providers: [
        McpConnectorsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(McpConnectorConnection),
          useValue: connectionRepository,
        },
      ],
    }).compile();

    service = app.get(McpConnectorsService);
  });

  describe('connect', () => {
    it('hashes an api_token and stores a masked hint, never the raw secret', async () => {
      const created = await service.connect({
        apiToken: 'sk_live_0123456789abcdef',
        authType: 'api_token',
        connectorKey: 'stripe',
        label: '  prod key  ',
        userId,
      });

      expect(created.credentialPrefix).toBe('sk_l…cdef');
      expect(created.credentialLabel).toBe('prod key');
      expect(created.enabled).toBe(true);
      // The raw token is never persisted; only a non-reversible bcrypt hash is.
      expect(created.credentialSecretHash).not.toBe('sk_live_0123456789abcdef');
      expect(created.credentialSecretHash).toMatch(/^\$2[aby]\$/);
      await expect(
        bcrypt.compare(
          'sk_live_0123456789abcdef',
          created.credentialSecretHash ?? '',
        ),
      ).resolves.toBe(true);
    });

    it('stores no credential for an oauth connector', async () => {
      const created = await service.connect({
        authType: 'oauth',
        connectorKey: 'github',
        userId,
      });

      expect(created.credentialPrefix).toBeNull();
      expect(created.credentialSecretHash).toBeNull();
      expect(created.enabled).toBe(true);
    });

    it('re-enables and refreshes an existing connection instead of inserting', async () => {
      connectionRepository.findOne.mockResolvedValue({
        authType: 'api_token',
        connectorKey: 'stripe',
        credentialPrefix: 'old…1234',
        credentialSecretHash: 'oldhash',
        enabled: false,
        id: connectionId,
        userId,
      });

      const updated = await service.connect({
        apiToken: 'sk_live_9999888877776666',
        authType: 'api_token',
        connectorKey: 'stripe',
        userId,
      });

      expect(connectionRepository.create).not.toHaveBeenCalled();
      expect(updated.enabled).toBe(true);
      expect(updated.credentialPrefix).toBe('sk_l…6666');
    });

    it('does not wipe an existing api_token hint on a bare re-enable', async () => {
      connectionRepository.findOne.mockResolvedValue({
        authType: 'api_token',
        connectorKey: 'stripe',
        credentialPrefix: 'sk_l…cdef',
        credentialSecretHash: 'existinghash',
        enabled: false,
        id: connectionId,
        userId,
      });

      const updated = await service.connect({
        authType: 'api_token',
        connectorKey: 'stripe',
        userId,
      });

      expect(updated.credentialPrefix).toBe('sk_l…cdef');
      expect(updated.credentialSecretHash).toBe('existinghash');
    });
  });

  describe('setEnabled', () => {
    it('returns null when the user has no connection for the key', async () => {
      connectionRepository.findOne.mockResolvedValue(null);
      await expect(
        service.setEnabled(userId, 'stripe', false),
      ).resolves.toBeNull();
    });

    it('flips the enabled flag', async () => {
      connectionRepository.findOne.mockResolvedValue({
        connectorKey: 'stripe',
        enabled: true,
        id: connectionId,
        userId,
      });
      const updated = await service.setEnabled(userId, 'stripe', false);
      expect(updated?.enabled).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('reports whether a row was removed', async () => {
      connectionRepository.delete.mockResolvedValue({ affected: 1 });
      await expect(service.disconnect(userId, 'stripe')).resolves.toBe(true);

      connectionRepository.delete.mockResolvedValue({ affected: 0 });
      await expect(service.disconnect(userId, 'stripe')).resolves.toBe(false);
    });
  });
});

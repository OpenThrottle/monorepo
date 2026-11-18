import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { McpConnectorConnection } from './mcp-connector-connection.entity.ts';
import { mcpConnectorConnectionsFactory } from './mcp-connector-connections.factory.ts';
import { McpConnectorConnectionsRepository } from './mcp-connector-connections.repository.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('McpConnectorConnectionsRepository', () => {
  const create = vi.fn();
  const find = vi.fn();
  const findOne = vi.fn();
  const save = vi.fn();
  const softDelete = vi.fn();

  let repository: McpConnectorConnectionsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    findOne.mockResolvedValue(null);
    create.mockImplementation((data: unknown) => {
      return data;
    });
    save.mockImplementation(async (entity: unknown) => {
      return entity;
    });

    const app = await Test.createTestingModule({
      providers: [
        McpConnectorConnectionsRepository,
        {
          provide: getRepositoryToken(McpConnectorConnection),
          useValue: createMock<Repository<McpConnectorConnection>>({
            create,
            find,
            findOne,
            save,
            softDelete,
            target: McpConnectorConnection,
          }),
        },
      ],
    }).compile();

    repository = app.get(McpConnectorConnectionsRepository);
  });

  describe('findConnectionsForUser', () => {
    it("reads the user's connections newest first", async () => {
      const rows = mcpConnectorConnectionsFactory.buildList(2, { userId });
      find.mockResolvedValue(rows);

      await expect(repository.findConnectionsForUser(userId)).resolves.toBe(
        rows,
      );
      expect(find).toHaveBeenCalledWith({
        order: { connectedAt: 'DESC' },
        where: { userId },
      });
    });
  });

  describe('connect', () => {
    describe('when the user has no live connection for the key', () => {
      it('hashes an api_token and stores a masked hint, never the raw secret', async () => {
        const created = await repository.connect({
          apiToken: 'sk_live_0123456789abcdef',
          authType: 'api_token',
          connectorKey: 'stripe',
          label: '  prod key  ',
          userId,
        });

        expect(created.credentialPrefix).toBe('sk_l…cdef');
        expect(created.credentialLabel).toBe('prod key');
        expect(created.enabled).toBe(true);
        expect(created.credentialSecretHash).toMatch(/^\$2[aby]\$/);
        await expect(
          bcrypt.compare(
            'sk_live_0123456789abcdef',
            created.credentialSecretHash ?? '',
          ),
        ).resolves.toBe(true);
      });

      it('stores no credential for an oauth connector', async () => {
        const created = await repository.connect({
          apiToken: undefined,
          authType: 'oauth',
          connectorKey: 'github',
          label: undefined,
          userId,
        });

        expect(created.credentialPrefix).toBeNull();
        expect(created.credentialSecretHash).toBeNull();
        expect(created.credentialLabel).toBeNull();
        expect(created.enabled).toBe(true);
      });
    });

    describe('when the user has a live connection for the key', () => {
      it('re-enables and refreshes it instead of inserting', async () => {
        findOne.mockResolvedValue(
          mcpConnectorConnectionsFactory.build({
            authType: 'api_token',
            connectorKey: 'stripe',
            credentialPrefix: 'old…1234',
            credentialSecretHash: 'oldhash',
            enabled: false,
            userId,
          }),
        );

        const updated = await repository.connect({
          apiToken: 'sk_live_9999888877776666',
          authType: 'api_token',
          connectorKey: 'stripe',
          label: null,
          userId,
        });

        expect(create).not.toHaveBeenCalled();
        expect(updated.enabled).toBe(true);
        expect(updated.credentialPrefix).toBe('sk_l…6666');
      });

      it('keeps an existing api_token hint on a bare re-enable', async () => {
        findOne.mockResolvedValue(
          mcpConnectorConnectionsFactory.build({
            authType: 'api_token',
            connectorKey: 'stripe',
            credentialPrefix: 'sk_l…cdef',
            credentialSecretHash: 'existinghash',
            enabled: false,
            userId,
          }),
        );

        const updated = await repository.connect({
          apiToken: null,
          authType: 'api_token',
          connectorKey: 'stripe',
          label: null,
          userId,
        });

        expect(updated.credentialPrefix).toBe('sk_l…cdef');
        expect(updated.credentialSecretHash).toBe('existinghash');
      });

      it('clears a stored credential when the connector is oauth', async () => {
        findOne.mockResolvedValue(
          mcpConnectorConnectionsFactory.build({
            credentialPrefix: 'sk_l…cdef',
            credentialSecretHash: 'existinghash',
            userId,
          }),
        );

        const updated = await repository.connect({
          apiToken: null,
          authType: 'oauth',
          connectorKey: 'github',
          label: null,
          userId,
        });

        expect(updated.credentialPrefix).toBeNull();
        expect(updated.credentialSecretHash).toBeNull();
      });
    });
  });

  describe('setEnabled', () => {
    describe('when the user has no live connection for the key', () => {
      it('returns null', async () => {
        await expect(
          repository.setEnabled(userId, 'stripe', false),
        ).resolves.toBeNull();
        expect(save).not.toHaveBeenCalled();
      });
    });

    describe('when the user has a live connection for the key', () => {
      it('flips the enabled flag', async () => {
        findOne.mockResolvedValue(
          mcpConnectorConnectionsFactory.build({ enabled: true, userId }),
        );

        const updated = await repository.setEnabled(userId, 'stripe', false);

        expect(updated?.enabled).toBe(false);
      });
    });
  });

  describe('disconnect', () => {
    it('soft deletes the live connection', async () => {
      softDelete.mockResolvedValue({ affected: 1 });

      await expect(repository.disconnect(userId, 'stripe')).resolves.toBe(true);
      expect(softDelete).toHaveBeenCalledWith({
        connectorKey: 'stripe',
        deletedAt: IsNull(),
        userId,
      });
    });

    it('reports false when there was no live connection', async () => {
      softDelete.mockResolvedValue({ affected: 0 });

      await expect(repository.disconnect(userId, 'stripe')).resolves.toBe(
        false,
      );
    });
  });
});

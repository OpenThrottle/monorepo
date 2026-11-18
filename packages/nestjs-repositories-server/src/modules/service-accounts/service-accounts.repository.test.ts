import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ServiceAccount } from './service-account.entity.ts';
import { serviceAccountsFactory } from './service-accounts.factory.ts';
import { ServiceAccountsRepository } from './service-accounts.repository.ts';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');
const actingUserId = '33333333-3333-4333-8333-333333333333';

describe('ServiceAccountsRepository', () => {
  const create = vi.fn();
  const find = vi.fn();
  const findOne = vi.fn();
  const save = vi.fn();
  let repository: ServiceAccountsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((data: Partial<ServiceAccount>) => {
      return data;
    });
    save.mockImplementation(async (entity: ServiceAccount) => {
      return entity;
    });

    const app = await Test.createTestingModule({
      providers: [
        ServiceAccountsRepository,
        {
          provide: getRepositoryToken(ServiceAccount),
          useValue: createMock<Repository<ServiceAccount>>({
            create,
            find,
            findOne,
            save,
            target: ServiceAccount,
          }),
        },
      ],
    }).compile();

    repository = app.get<ServiceAccountsRepository>(ServiceAccountsRepository);
  });

  describe('create', () => {
    it('spells the omitted nullable columns out as null', async () => {
      await repository.create({ name: 'workflow-ralph' });

      expect(save).toHaveBeenCalledWith(
        {
          actingUserId: null,
          description: null,
          disabledAt: null,
          name: 'workflow-ralph',
        },
        undefined,
      );
    });

    it('keeps a supplied description', async () => {
      await repository.create({ description: 'runs plans', name: 'ralph' });

      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'runs plans', name: 'ralph' }),
        undefined,
      );
    });
  });

  describe('findAll', () => {
    it('returns accounts newest first with clamped pagination', async () => {
      const accounts = serviceAccountsFactory.buildList(2);
      find.mockResolvedValue(accounts);

      await expect(repository.findAll({ limit: 5, offset: 10 })).resolves.toBe(
        accounts,
      );
      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 5,
      });
    });
  });

  describe('findByName', () => {
    it('looks an account up by name', async () => {
      const account = serviceAccountsFactory.build({ name: 'ralph' });
      findOne.mockResolvedValue(account);

      await expect(repository.findByName('ralph')).resolves.toBe(account);
      expect(findOne).toHaveBeenCalledWith({ where: { name: 'ralph' } });
    });

    it('returns null when no account has that name', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.findByName('nope')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('sets actingUserId', async () => {
      findOne.mockResolvedValue(
        serviceAccountsFactory.build({ actingUserId: null }),
      );

      const updated = await repository.update('id', { actingUserId });

      expect(updated.actingUserId).toBe(actingUserId);
    });

    it('clears actingUserId with an explicit null', async () => {
      findOne.mockResolvedValue(serviceAccountsFactory.build({ actingUserId }));

      const updated = await repository.update('id', { actingUserId: null });

      expect(updated.actingUserId).toBeNull();
    });

    it('leaves actingUserId unchanged when omitted', async () => {
      findOne.mockResolvedValue(serviceAccountsFactory.build({ actingUserId }));

      const updated = await repository.update('id', { description: 'renamed' });

      expect(updated.actingUserId).toBe(actingUserId);
      expect(updated.description).toBe('renamed');
    });
  });

  describe('resolveActingUserId', () => {
    it('returns the linked user for an enabled account', async () => {
      findOne.mockResolvedValue(serviceAccountsFactory.build({ actingUserId }));

      await expect(repository.resolveActingUserId('id')).resolves.toBe(
        actingUserId,
      );
    });

    it('returns null for an unlinked account', async () => {
      findOne.mockResolvedValue(
        serviceAccountsFactory.build({ actingUserId: null }),
      );

      await expect(repository.resolveActingUserId('id')).resolves.toBeNull();
    });

    it('returns null for a disabled account even when linked', async () => {
      findOne.mockResolvedValue(
        serviceAccountsFactory.build({ actingUserId, disabledAt: FIXED_NOW }),
      );

      await expect(repository.resolveActingUserId('id')).resolves.toBeNull();
    });

    it('returns null for a missing account', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.resolveActingUserId('id')).resolves.toBeNull();
    });
  });

  describe('disable', () => {
    it('stamps disabledAt on the account', async () => {
      findOne.mockResolvedValue(
        serviceAccountsFactory.build({ disabledAt: null }),
      );

      const disabled = await repository.disable('id');

      expect(disabled.disabledAt).toBeInstanceOf(Date);
      expect(save).toHaveBeenCalledWith(disabled);
    });

    it('throws NotFoundException when the account is missing', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.disable('id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('enable', () => {
    it('clears disabledAt on the account', async () => {
      findOne.mockResolvedValue(
        serviceAccountsFactory.build({ disabledAt: FIXED_NOW }),
      );

      const enabled = await repository.enable('id');

      expect(enabled.disabledAt).toBeNull();
      expect(save).toHaveBeenCalledWith(enabled);
    });

    it('throws NotFoundException when the account is missing', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.enable('id')).rejects.toThrow(NotFoundException);
    });
  });
});

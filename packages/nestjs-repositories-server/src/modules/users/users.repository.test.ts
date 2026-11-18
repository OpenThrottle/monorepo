import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from './user.entity.ts';
import { usersFactory } from './users.factory.ts';
import { UsersRepository } from './users.repository.ts';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

describe('UsersRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const save = vi.fn();
  let repository: UsersRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    save.mockImplementation(async (entity: User) => {
      return entity;
    });

    const app = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: getRepositoryToken(User),
          useValue: createMock<Repository<User>>({
            find,
            findOne,
            save,
            target: User,
          }),
        },
      ],
    }).compile();

    repository = app.get<UsersRepository>(UsersRepository);
  });

  describe('findByEmail', () => {
    it('looks a live user up by email', async () => {
      const user = usersFactory.build({ email: 'a@b.com' });
      findOne.mockResolvedValue(user);

      await expect(repository.findByEmail('a@b.com')).resolves.toBe(user);
      expect(findOne).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
    });

    it('returns null when no user has that email', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.findByEmail('x@y.z')).resolves.toBeNull();
    });
  });

  describe('findByGithubUsername', () => {
    it('looks a live user up by github username', async () => {
      const user = usersFactory.build({ githubUsername: 'visormatt' });
      findOne.mockResolvedValue(user);

      await expect(repository.findByGithubUsername('visormatt')).resolves.toBe(
        user,
      );
      expect(findOne).toHaveBeenCalledWith({
        where: { githubUsername: 'visormatt' },
      });
    });

    it('returns null when no user has that username', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.findByGithubUsername('nope')).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns users newest first with clamped pagination', async () => {
      const users = usersFactory.buildList(2);
      find.mockResolvedValue(users);

      const found = await repository.findAll({ limit: 5, offset: 10 });

      expect(found).toBe(users);
      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 5,
      });
    });

    it('applies the default page when no pagination is given', async () => {
      find.mockResolvedValue([]);

      await repository.findAll();

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
    });
  });

  describe('disable', () => {
    it('stamps disabledAt on the user', async () => {
      const user = usersFactory.build({ disabledAt: null });
      findOne.mockResolvedValue(user);

      const disabled = await repository.disable(user.id);

      expect(disabled.disabledAt).toBeInstanceOf(Date);
      expect(save).toHaveBeenCalledWith(disabled);
    });

    it('throws NotFoundException when the user is missing', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.disable('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('enable', () => {
    it('clears disabledAt on the user', async () => {
      const user = usersFactory.build({ disabledAt: FIXED_NOW });
      findOne.mockResolvedValue(user);

      const enabled = await repository.enable(user.id);

      expect(enabled.disabledAt).toBeNull();
      expect(save).toHaveBeenCalledWith(enabled);
    });

    it('throws NotFoundException when the user is missing', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.enable('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

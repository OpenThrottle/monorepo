import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Permission } from './permission.entity.ts';
import { permissionsFactory } from './permissions.factory.ts';
import { PermissionsRepository } from './permissions.repository.ts';

describe('PermissionsRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  let repository: PermissionsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = await Test.createTestingModule({
      providers: [
        PermissionsRepository,
        {
          provide: getRepositoryToken(Permission),
          useValue: createMock<Repository<Permission>>({
            find,
            findOne,
            target: Permission,
          }),
        },
      ],
    }).compile();

    repository = app.get<PermissionsRepository>(PermissionsRepository);
  });

  describe('findByName', () => {
    it('looks a permission up by name', async () => {
      const permission = permissionsFactory.build({ name: 'users:read' });
      findOne.mockResolvedValue(permission);

      await expect(repository.findByName('users:read')).resolves.toBe(
        permission,
      );
      expect(findOne).toHaveBeenCalledWith({ where: { name: 'users:read' } });
    });

    it('returns null when no permission has that name', async () => {
      findOne.mockResolvedValue(null);

      await expect(repository.findByName('nope')).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns every permission ordered by name', async () => {
      const permissions = permissionsFactory.buildList(2);
      find.mockResolvedValue(permissions);

      await expect(repository.findAll()).resolves.toBe(permissions);
      expect(find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });
  });
});

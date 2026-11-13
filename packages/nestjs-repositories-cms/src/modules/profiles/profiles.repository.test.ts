import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Profile } from './profile.entity.ts';
import { profilesFactory } from './profiles.factory.ts';
import { ProfilesRepository } from './profiles.repository.ts';

describe('ProfilesRepository', () => {
  const rows = profilesFactory.buildList(2);
  const typeorm = createMock<Repository<Profile>>({
    find: () => Promise.resolve(rows),
    target: Profile,
  });

  let repository: ProfilesRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        ProfilesRepository,
        {
          provide: getRepositoryToken(Profile, CMS_CONNECTION),
          useValue: typeorm,
        },
      ],
    }).compile();

    repository = app.get(ProfilesRepository);
  });

  describe('findBy', () => {
    it('reads live rows from the repository registered on the cms connection', async () => {
      await expect(repository.findBy()).resolves.toBe(rows);
      expect(typeorm.find).toHaveBeenCalledWith({
        where: { isDeleted: expect.anything() },
      });
    });
  });
});

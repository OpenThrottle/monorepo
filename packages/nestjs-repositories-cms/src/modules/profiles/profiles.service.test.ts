import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Profile } from './profile.entity.ts';
import { profilesFactory } from './profiles.factory.ts';
import { ProfilesService } from './profiles.service.ts';

describe('ProfilesService', () => {
  type GetRepository = ReturnType<ProfilesService['getRepository']>;

  let service: ProfilesService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: getRepositoryToken(Profile, CMS_CONNECTION),
          useValue: createMock<GetRepository>({
            find: () => Promise.resolve(profilesFactory.buildList(2)),
          }),
        },
      ],
    }).compile();

    service = app.get<ProfilesService>(ProfilesService);
  });

  describe('getRepository', () => {
    it('returns the repository registered on the cms connection', async () => {
      const rows = await service.getRepository().find();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ email: expect.anything() });
    });
  });
});

import { createMock } from '@golevelup/ts-vitest';
import { In } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import { librariesFactory } from '../../modules/libraries/libraries.factory.ts';
import type { LibrariesRepository } from '../../modules/libraries/libraries.repository.ts';
import { libraryComponentsFactory } from '../../modules/library-components/library-components.factory.ts';
import type { LibraryComponentsRepository } from '../../modules/library-components/library-components.repository.ts';
import { CmsLibrariesService } from './cms-libraries.service.ts';

const buildService = () => {
  const librariesRepository = createMock<LibrariesRepository>();
  const libraryComponentsRepository = createMock<LibraryComponentsRepository>();

  return {
    librariesRepository,
    libraryComponentsRepository,
    service: new CmsLibrariesService(
      librariesRepository,
      libraryComponentsRepository,
    ),
  };
};

describe('CmsLibrariesService', () => {
  describe('findPage', () => {
    it('loads every listed library’s components in one query and groups them', async () => {
      const { librariesRepository, libraryComponentsRepository, service } =
        buildService();
      const [first, second] = librariesFactory.buildList(2);

      if (!first || !second) throw new Error('factory built too few');

      vi.mocked(librariesRepository.findByPaginated).mockResolvedValue({
        data: [first, second],
        pageInfo: { currentPage: 1, hasNextPage: true, totalCount: 7 },
      });
      vi.mocked(libraryComponentsRepository.findBy).mockResolvedValue([
        libraryComponentsFactory.build({ libraryUuid: second.uuid }),
      ]);

      const page = await service.findPage({ skip: 0, take: 2 });

      expect(librariesRepository.findByPaginated).toHaveBeenCalledWith({
        skip: 0,
        take: 2,
      });
      expect(libraryComponentsRepository.findBy).toHaveBeenCalledTimes(1);
      expect(libraryComponentsRepository.findBy).toHaveBeenCalledWith({
        order: { typename: 'ASC', uuid: 'ASC' },
        where: { libraryUuid: In([first.uuid, second.uuid]) },
      });
      expect(page.hasNextPage).toBe(true);
      expect(page.totalCount).toBe(7);
      expect(page.items[0]?.components).toEqual([]);
      expect(page.items[1]?.components).toHaveLength(1);
    });

    it('skips the component query on an empty page', async () => {
      const { librariesRepository, libraryComponentsRepository, service } =
        buildService();

      vi.mocked(librariesRepository.findByPaginated).mockResolvedValue({
        data: [],
        pageInfo: { currentPage: 1, hasNextPage: false, totalCount: 0 },
      });

      await expect(service.findPage({ skip: 0, take: 25 })).resolves.toEqual({
        hasNextPage: false,
        items: [],
        totalCount: 0,
      });
      expect(libraryComponentsRepository.findBy).not.toHaveBeenCalled();
    });
  });

  describe('findByUuid', () => {
    it('returns null for a non-uuid without querying', async () => {
      const { librariesRepository, service } = buildService();

      await expect(service.findByUuid('nope')).resolves.toBeNull();
      expect(librariesRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns null when no live library matches', async () => {
      const { librariesRepository, libraryComponentsRepository, service } =
        buildService();
      const library = librariesFactory.build();

      vi.mocked(librariesRepository.findOne).mockResolvedValue(null);

      await expect(service.findByUuid(library.uuid)).resolves.toBeNull();
      expect(libraryComponentsRepository.findBy).not.toHaveBeenCalled();
    });

    it('returns the library with its components', async () => {
      const { librariesRepository, libraryComponentsRepository, service } =
        buildService();
      const library = librariesFactory.build();

      vi.mocked(librariesRepository.findOne).mockResolvedValue(library);
      vi.mocked(libraryComponentsRepository.findBy).mockResolvedValue([
        libraryComponentsFactory.build({ libraryUuid: library.uuid }),
      ]);

      const found = await service.findByUuid(library.uuid);

      expect(found?.uuid).toBe(library.uuid);
      expect(found?.components).toHaveLength(1);
    });
  });
});

import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';

import type { LibrariesRepository } from '../../modules/libraries/libraries.repository.ts';
import { libraryComponentsFactory } from '../../modules/library-components/library-components.factory.ts';
import type { LibraryComponentsRepository } from '../../modules/library-components/library-components.repository.ts';
import { CmsSchemaValidationService } from '../cms-schema-validation/cms-schema-validation.service.ts';
import { CmsLibraryComponentsService } from './cms-library-components.service.ts';

const buildService = () => {
  const librariesRepository = createMock<LibrariesRepository>();
  const libraryComponentsRepository = createMock<LibraryComponentsRepository>();

  return {
    libraryComponentsRepository,
    service: new CmsLibraryComponentsService(
      librariesRepository,
      libraryComponentsRepository,
      new CmsSchemaValidationService(),
    ),
  };
};

describe('CmsLibraryComponentsService', () => {
  describe('findByUuid', () => {
    it('returns null for a non-uuid without querying', async () => {
      const { libraryComponentsRepository, service } = buildService();

      await expect(service.findByUuid('nope')).resolves.toBeNull();
      expect(libraryComponentsRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns null when no live component matches', async () => {
      const { libraryComponentsRepository, service } = buildService();

      vi.mocked(libraryComponentsRepository.findOne).mockResolvedValue(null);

      await expect(
        service.findByUuid(libraryComponentsFactory.build().uuid),
      ).resolves.toBeNull();
    });

    it('returns the mapped component', async () => {
      const { libraryComponentsRepository, service } = buildService();
      const component = libraryComponentsFactory.build();

      vi.mocked(libraryComponentsRepository.findOne).mockResolvedValue(
        component,
      );

      await expect(service.findByUuid(component.uuid)).resolves.toMatchObject({
        typename: component.typename,
        uuid: component.uuid,
      });
    });
  });
});

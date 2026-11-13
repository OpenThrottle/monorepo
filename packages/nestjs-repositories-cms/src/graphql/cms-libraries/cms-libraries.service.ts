import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';

import { LibrariesRepository } from '../../modules/libraries/libraries.repository.ts';
import type { LibraryComponent } from '../../modules/library-components/library-component.entity.ts';
import { LibraryComponentsRepository } from '../../modules/library-components/library-components.repository.ts';
import { toCmsLibraryObject } from './cms-libraries.mapper.ts';
import type { CmsLibraryListResult } from './cms-libraries.object.ts';

/**
 * @description Pages cms libraries with their components: one query for the page and one for
 * every listed library's components, never one per library.
 * @public
 */
@Injectable()
export class CmsLibrariesService {
  constructor(
    private readonly librariesRepository: LibrariesRepository,
    private readonly libraryComponentsRepository: LibraryComponentsRepository,
  ) {}

  /**
   * @description One bounded page of live libraries, each with its live components.
   */
  async findPage(options: {
    readonly skip: number;
    readonly take: number;
  }): Promise<CmsLibraryListResult> {
    const page = await this.librariesRepository.findByPaginated(options);
    const libraryUuids = page.data.map((library) => library.uuid);
    const components = await this.findComponents(libraryUuids);
    const byLibrary = new Map<string, LibraryComponent[]>();

    for (const component of components) {
      const list = byLibrary.get(component.libraryUuid) ?? [];

      list.push(component);
      byLibrary.set(component.libraryUuid, list);
    }

    return {
      hasNextPage: page.pageInfo.hasNextPage,
      items: page.data.map((library) => {
        return toCmsLibraryObject(library, byLibrary.get(library.uuid) ?? []);
      }),
      totalCount: page.pageInfo.totalCount,
    };
  }

  private async findComponents(
    libraryUuids: readonly string[],
  ): Promise<LibraryComponent[]> {
    if (libraryUuids.length === 0) {
      return [];
    }

    return this.libraryComponentsRepository.findBy({
      order: { typename: 'ASC', uuid: 'ASC' },
      where: { libraryUuid: In([...libraryUuids]) },
    });
  }
}

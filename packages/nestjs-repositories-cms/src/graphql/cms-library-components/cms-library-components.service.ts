import { Injectable } from '@nestjs/common';

import { CMS_STATUS } from '../../config/config.constants.ts';
import { LibrariesRepository } from '../../modules/libraries/libraries.repository.ts';
import type { LibraryComponent } from '../../modules/library-components/library-component.entity.ts';
import { LibraryComponentsRepository } from '../../modules/library-components/library-components.repository.ts';
import {
  assertCmsUuid,
  createCmsGraphqlError,
  parseCmsJsonObject,
  parseCmsStatus,
} from '../cms-graphql/cms-graphql.utils.ts';
import { toCmsLibraryComponentObject } from '../cms-libraries/cms-libraries.mapper.ts';
import type {
  CmsLibraryComponentListResult,
  CmsLibraryComponentObject,
} from '../cms-libraries/cms-libraries.object.ts';
import { CmsSchemaValidationService } from '../cms-schema-validation/cms-schema-validation.service.ts';
import type {
  CreateCmsLibraryComponentInput,
  UpdateCmsLibraryComponentInput,
} from './cms-library-components.input.ts';

/**
 * @description Writes cms library components. A props schema must compile under the same strict
 * Ajv that validates fragment properties. Whether libraries outlive the code-registered blocks is
 * still open (OT plan 4a977e20), so this stays to plain create / update / soft delete.
 * @public
 */
@Injectable()
export class CmsLibraryComponentsService {
  constructor(
    private readonly librariesRepository: LibrariesRepository,
    private readonly libraryComponentsRepository: LibraryComponentsRepository,
    private readonly validation: CmsSchemaValidationService,
  ) {}

  /**
   * @description One bounded page of live components across every library, by typename.
   */
  async findPage(options: {
    readonly skip: number;
    readonly take: number;
  }): Promise<CmsLibraryComponentListResult> {
    const page = await this.libraryComponentsRepository.findByPaginated({
      ...options,
      order: { typename: 'ASC', uuid: 'ASC' },
    });

    return {
      hasNextPage: page.pageInfo.hasNextPage,
      items: page.data.map(toCmsLibraryComponentObject),
      totalCount: page.pageInfo.totalCount,
    };
  }

  async create(
    input: CreateCmsLibraryComponentInput,
  ): Promise<CmsLibraryComponentObject> {
    assertCmsUuid('library', input.libraryUuid);

    const library = await this.librariesRepository.findOne({
      where: { uuid: input.libraryUuid },
    });

    if (!library) {
      throw createCmsGraphqlError(
        'NOT_FOUND',
        `No library "${input.libraryUuid}"`,
      );
    }

    const component = await this.libraryComponentsRepository.create({
      code: input.code,
      libraryUuid: library.uuid,
      name: input.name,
      propsSchema: this.parsePropsSchema(input.propsSchemaJson) ?? {},
      status: parseCmsStatus(input.status) ?? CMS_STATUS.DRAFT,
      typename: input.typename,
    });

    return toCmsLibraryComponentObject(component);
  }

  async update(
    input: UpdateCmsLibraryComponentInput,
  ): Promise<CmsLibraryComponentObject> {
    const component = await this.findLive(input.uuid);
    const propsSchema = this.parsePropsSchema(input.propsSchemaJson);
    const status = parseCmsStatus(input.status);
    const changes: Partial<
      Pick<
        LibraryComponent,
        'code' | 'name' | 'propsSchema' | 'status' | 'typename'
      >
    > = {};

    if (input.code !== null && input.code !== undefined) {
      changes.code = input.code;
    }

    if (input.name !== null && input.name !== undefined) {
      changes.name = input.name;
    }

    if (propsSchema !== null) {
      changes.propsSchema = propsSchema;
    }

    if (status !== null) {
      changes.status = status;
    }

    if (input.typename !== null && input.typename !== undefined) {
      changes.typename = input.typename;
    }

    const saved = await this.libraryComponentsRepository.update(
      component.uuid,
      changes,
    );

    return toCmsLibraryComponentObject(saved);
  }

  async delete(uuid: string): Promise<CmsLibraryComponentObject> {
    const component = await this.findLive(uuid);
    const removed = await this.libraryComponentsRepository.remove(
      component.uuid,
    );

    return toCmsLibraryComponentObject(removed);
  }

  private async findLive(uuid: string): Promise<LibraryComponent> {
    assertCmsUuid('library component', uuid);

    const component = await this.libraryComponentsRepository.findOne({
      where: { uuid },
    });

    if (!component) {
      throw createCmsGraphqlError(
        'NOT_FOUND',
        `No library component "${uuid}"`,
      );
    }

    return component;
  }

  /**
   * @description The parsed props schema, or null when omitted.
   * @throws GraphQLError BAD_USER_INPUT when it is not an object or does not compile.
   */
  private parsePropsSchema(
    json: string | null | undefined,
  ): Record<string, unknown> | null {
    if (json === null || json === undefined) {
      return null;
    }

    const schema = parseCmsJsonObject('propsSchemaJson', json);
    const result = this.validation.check(schema);

    if (!result.ok) {
      throw createCmsGraphqlError(
        'BAD_USER_INPUT',
        `propsSchemaJson is not a valid JSON Schema`,
        { field: 'propsSchemaJson', issues: result.issues },
      );
    }

    return schema;
  }
}

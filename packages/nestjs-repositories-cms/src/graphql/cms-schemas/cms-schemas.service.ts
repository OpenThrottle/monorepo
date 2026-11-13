import { Injectable } from '@nestjs/common';
import type { FindOptionsWhere } from 'typeorm';

import { CMS_STATUS } from '../../config/config.constants.ts';
import type { CmsStatus } from '../../config/config.types.ts';
import type { Schema } from '../../modules/schemas/schema.entity.ts';
import { SchemasRepository } from '../../modules/schemas/schemas.repository.ts';
import { isCmsUuid } from '../cms-graphql/cms-graphql.utils.ts';
import { toCmsSchemaObject } from './cms-schemas.mapper.ts';
import type {
  CmsSchemaListResult,
  CmsSchemaObject,
} from './cms-schemas.object.ts';

/**
 * @description Reads live cms schemas.
 * @public
 */
@Injectable()
export class CmsSchemasService {
  constructor(private readonly schemasRepository: SchemasRepository) {}

  /**
   * @description One bounded page, optionally filtered by status and/or typename, newest first
   * and then by typename.
   */
  async findPage(options: {
    readonly skip: number;
    readonly status: CmsStatus | null;
    readonly take: number;
    readonly typename: string | null;
  }): Promise<CmsSchemaListResult> {
    const { skip, status, take, typename } = options;
    const where: FindOptionsWhere<Schema> = {
      ...(status !== null && { status }),
      ...(typename !== null && { typename }),
    };
    const page = await this.schemasRepository.findByPaginated({
      order: { createdAt: 'DESC', typename: 'ASC', uuid: 'ASC' },
      skip,
      take,
      where,
    });

    return {
      hasNextPage: page.pageInfo.hasNextPage,
      items: page.data.map(toCmsSchemaObject),
      totalCount: page.pageInfo.totalCount,
    };
  }

  /**
   * @description The live schema with this uuid, or null.
   */
  async findByUuid(uuid: string): Promise<CmsSchemaObject | null> {
    if (!isCmsUuid(uuid)) {
      return null;
    }

    const schema = await this.schemasRepository.findOne({ where: { uuid } });

    return schema ? toCmsSchemaObject(schema) : null;
  }

  /**
   * @description The live schema for `typename` at `version`; without a version, its newest
   * ACTIVE version. Null when none matches.
   */
  async findByTypename(
    typename: string,
    version: string | null,
  ): Promise<CmsSchemaObject | null> {
    const isLatestActive = version === null;
    const where: FindOptionsWhere<Schema> = isLatestActive
      ? { status: CMS_STATUS.ACTIVE, typename }
      : { typename, version };
    const schema = await this.schemasRepository.findOne({
      order: { createdAt: 'DESC', uuid: 'DESC' },
      where,
    });

    return schema ? toCmsSchemaObject(schema) : null;
  }
}

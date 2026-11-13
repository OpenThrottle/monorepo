import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { GraphQLError } from 'graphql';
import { DataSource } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { Fragment } from '../../modules/fragments/fragment.entity.ts';
import { FragmentsRepository } from '../../modules/fragments/fragments.repository.ts';
import { Layout } from '../../modules/layouts/layout.entity.ts';
import { LayoutsRepository } from '../../modules/layouts/layouts.repository.ts';
import { CMS_FRAGMENT_TREE_MAX_NODES } from '../cms-fragment-tree/cms-fragment-tree.constants.ts';
import { buildCmsFragmentTreeNodes } from '../cms-fragment-tree/cms-fragment-tree.utils.ts';
import { CmsFragmentsService } from '../cms-fragments/cms-fragments.service.ts';
import {
  assertCmsUuid,
  createCmsGraphqlError,
  isCmsUuid,
  parseCmsJsonObject,
  parseCmsStatus,
} from '../cms-graphql/cms-graphql.utils.ts';
import type {
  CreateCmsLayoutInput,
  UpdateCmsLayoutInput,
} from './cms-layouts.input.ts';
import {
  toCmsLayoutObject,
  toCmsLayoutSummaryObject,
} from './cms-layouts.mapper.ts';
import type {
  CmsLayoutListResult,
  CmsLayoutObject,
  CmsLayoutSummaryObject,
} from './cms-layouts.object.ts';

/** The typename a layout's root fragment is created with. */
const CMS_LAYOUT_ROOT_TYPENAME = 'Layout';

/**
 * @description Reads and writes cms layouts. A read with its fragment tree is two statements
 * (the layout, then one recursive query for the whole tree), whatever the tree's size. Writes
 * that touch the layout and its root fragment run in one transaction on the cms connection.
 * @public
 */
@Injectable()
export class CmsLayoutsService {
  constructor(
    @InjectDataSource(CMS_CONNECTION)
    private readonly dataSource: DataSource,
    private readonly cmsFragmentsService: CmsFragmentsService,
    private readonly fragmentsRepository: FragmentsRepository,
    private readonly layoutsRepository: LayoutsRepository,
  ) {}

  /**
   * @description One bounded page of live layouts, without their trees.
   */
  async findPage(options: {
    readonly skip: number;
    readonly take: number;
  }): Promise<CmsLayoutListResult> {
    const page = await this.layoutsRepository.findByPaginated(options);

    return {
      hasNextPage: page.pageInfo.hasNextPage,
      items: page.data.map(toCmsLayoutSummaryObject),
      totalCount: page.pageInfo.totalCount,
    };
  }

  /**
   * @description Creates a layout and its root `is_system` fragment (the newest ACTIVE "Layout"
   * schema, prefilled with its defaults) in one transaction; neither exists if either insert
   * fails.
   * @throws GraphQLError CONFLICT for a slug any layout already has, BAD_USER_INPUT when there is
   * no ACTIVE "Layout" schema.
   */
  async create(input: CreateCmsLayoutInput): Promise<CmsLayoutSummaryObject> {
    await this.assertSlugFree(input.slug, null);

    const schema = await this.cmsFragmentsService.findActiveSchema(
      CMS_LAYOUT_ROOT_TYPENAME,
    );
    const properties = this.cmsFragmentsService.buildValidProperties(
      schema,
      {},
    );
    const layout = await this.dataSource.transaction(async (manager) => {
      const fragments = manager.getRepository(Fragment);
      const layouts = manager.getRepository(Layout);
      const root = await fragments.save(
        fragments.create({
          isSystem: true,
          name: input.name,
          properties,
          schemaUuid: schema.uuid,
          typename: schema.typename,
        }),
      );

      return layouts.save(
        layouts.create({
          fragmentUuid: root.uuid,
          metadata: {},
          name: input.name,
          slug: input.slug,
          tags: [],
        }),
      );
    });

    return toCmsLayoutSummaryObject(layout);
  }

  /**
   * @description Applies the given changes to a live layout.
   * @throws GraphQLError NOT_FOUND, CONFLICT for a taken slug, BAD_USER_INPUT for a bad status
   * or metadata.
   */
  async update(input: UpdateCmsLayoutInput): Promise<CmsLayoutSummaryObject> {
    const layout = await this.findLive(input.uuid);
    const status = parseCmsStatus(input.status);
    const changes: Partial<
      Pick<Layout, 'metadata' | 'name' | 'slug' | 'status' | 'tags'>
    > = {};

    if (input.slug !== null && input.slug !== undefined) {
      await this.assertSlugFree(input.slug, layout.uuid);
      changes.slug = input.slug;
    }

    if (input.metadataJson !== null && input.metadataJson !== undefined) {
      changes.metadata = parseCmsJsonObject('metadataJson', input.metadataJson);
    }

    if (input.name !== null && input.name !== undefined) {
      changes.name = input.name;
    }

    if (status !== null) {
      changes.status = status;
    }

    if (input.tags !== null && input.tags !== undefined) {
      changes.tags = input.tags;
    }

    const saved = await this.layoutsRepository.update(layout.uuid, changes);

    return toCmsLayoutSummaryObject(saved);
  }

  /**
   * @description Soft deletes a layout and its root fragment together, in one transaction.
   * @throws GraphQLError NOT_FOUND when there is no live layout.
   */
  async delete(uuid: string): Promise<CmsLayoutSummaryObject> {
    const layout = await this.findLive(uuid);

    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(Layout)
        .update({ uuid: layout.uuid }, { isDeleted: true });
      await manager
        .getRepository(Fragment)
        .update({ uuid: layout.fragmentUuid }, { isDeleted: true });
    });

    return toCmsLayoutSummaryObject({ ...layout, isDeleted: true });
  }

  /**
   * @description The live layout with this slug, or null.
   */
  async findBySlug(slug: string): Promise<CmsLayoutObject | null> {
    const layout = await this.layoutsRepository.findOne({ where: { slug } });

    return layout ? this.withTree(layout) : null;
  }

  /**
   * @description The live layout with this uuid, or null.
   */
  async findByUuid(uuid: string): Promise<CmsLayoutObject | null> {
    if (!isCmsUuid(uuid)) {
      return null;
    }

    const layout = await this.layoutsRepository.findOne({ where: { uuid } });

    return layout ? this.withTree(layout) : null;
  }

  private async findLive(uuid: string): Promise<Layout> {
    assertCmsUuid('layout', uuid);

    const layout = await this.layoutsRepository.findOne({ where: { uuid } });

    if (!layout) {
      throw createCmsGraphqlError('NOT_FOUND', `No layout "${uuid}"`);
    }

    return layout;
  }

  /**
   * @description Slugs are unique across every row (the index includes deleted layouts).
   */
  private async assertSlugFree(
    slug: string,
    exceptUuid: string | null,
  ): Promise<void> {
    const taken = await this.layoutsRepository.findOne({
      where: { slug },
      withDeleted: true,
    });

    if (taken && taken.uuid !== exceptUuid) {
      throw createCmsGraphqlError(
        'CONFLICT',
        `A layout with slug "${slug}" already exists`,
        { field: 'slug' },
      );
    }
  }

  private async withTree(layout: Layout): Promise<CmsLayoutObject> {
    const result = await this.fragmentsRepository.findTreeRows(
      layout.fragmentUuid,
    );

    if (!result.ok) {
      throw new GraphQLError(
        `Layout "${layout.slug}" has more than ${CMS_FRAGMENT_TREE_MAX_NODES} fragment occurrences`,
        { extensions: { code: 'CMS_TREE_TOO_LARGE' } },
      );
    }

    return toCmsLayoutObject(layout, buildCmsFragmentTreeNodes(result.rows));
  }
}

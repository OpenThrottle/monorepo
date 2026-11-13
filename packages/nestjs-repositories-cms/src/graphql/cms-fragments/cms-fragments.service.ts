import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { DataSource, Equal, IsNull, Or } from 'typeorm';

import { CMS_CONNECTION, CMS_STATUS } from '../../config/config.constants.ts';
import { Fragment } from '../../modules/fragments/fragment.entity.ts';
import { FragmentsRepository } from '../../modules/fragments/fragments.repository.ts';
import type { Schema } from '../../modules/schemas/schema.entity.ts';
import { SchemasRepository } from '../../modules/schemas/schemas.repository.ts';
import { CMS_FRAGMENT_TREE_MAX_NODES } from '../cms-fragment-tree/cms-fragment-tree.constants.ts';
import type { CmsFragmentTreeRow } from '../cms-fragment-tree/cms-fragment-tree.types.ts';
import {
  assertCmsUuid,
  createCmsGraphqlError,
  isCmsUuid,
  parseCmsJsonObject,
} from '../cms-graphql/cms-graphql.utils.ts';
import { CmsSchemaValidationService } from '../cms-schema-validation/cms-schema-validation.service.ts';
import type {
  CloneCmsFragmentInput,
  CreateCmsFragmentInput,
  UpdateCmsFragmentInput,
} from './cms-fragments.input.ts';
import { toCmsFragmentObject } from './cms-fragments.mapper.ts';
import type {
  CmsFragmentListResult,
  CmsFragmentObject,
} from './cms-fragments.object.ts';
import { planCmsFragmentClone } from './cms-fragments.utils.ts';

/**
 * @description Writes cms fragments. Properties are validated server-side against the schema
 * the fragment is pinned to: the newest ACTIVE version of its typename at creation, and that same
 * version on every later update. Expected failures are GraphQLErrors with `extensions.code`.
 * @public
 */
@Injectable()
export class CmsFragmentsService {
  constructor(
    @InjectDataSource(CMS_CONNECTION)
    private readonly dataSource: DataSource,
    private readonly fragmentsRepository: FragmentsRepository,
    private readonly schemasRepository: SchemasRepository,
    private readonly validation: CmsSchemaValidationService,
  ) {}

  /**
   * @description One bounded page of live fragments, oldest first, optionally narrowed to one
   * typename and/or to system (`true`) or editor (`false`) fragments. `is_system` is nullable,
   * and NULL counts as not system.
   */
  async findPage(options: {
    readonly isSystem: boolean | null;
    readonly skip: number;
    readonly take: number;
    readonly typename: string | null;
  }): Promise<CmsFragmentListResult> {
    const where: FindOptionsWhere<Fragment> = {};

    if (options.typename !== null) {
      where.typename = options.typename;
    }

    if (options.isSystem !== null) {
      where.isSystem = options.isSystem
        ? Equal(true)
        : Or(Equal(false), IsNull());
    }

    const page = await this.fragmentsRepository.findByPaginated({
      skip: options.skip,
      take: options.take,
      where,
    });

    return {
      hasNextPage: page.pageInfo.hasNextPage,
      items: page.data.map(toCmsFragmentObject),
      totalCount: page.pageInfo.totalCount,
    };
  }

  /**
   * @description The live fragment with this uuid, or null.
   */
  async findByUuid(uuid: string): Promise<CmsFragmentObject | null> {
    if (!isCmsUuid(uuid)) {
      return null;
    }

    const fragment = await this.fragmentsRepository.findOne({
      where: { uuid },
    });

    return fragment ? toCmsFragmentObject(fragment) : null;
  }

  /**
   * @description Copies a live fragment onto the same pinned schema version (never the newest),
   * with its properties as stored, and with `includeChildren` a fresh copy of its live subtree
   * (new fragments, new edges, same order), all in one transaction. The copy is never
   * `is_system` and has no parent; attach it with `addCmsFragmentChild`.
   * @throws GraphQLError NOT_FOUND for a missing fragment, BAD_USER_INPUT for a subtree larger
   * than the tree cap.
   */
  async clone(input: CloneCmsFragmentInput): Promise<CmsFragmentObject> {
    const source = await this.findLive(input.uuid);
    const rows = await this.findCloneRows(
      source,
      input.includeChildren === true,
    );
    const plan = planCmsFragmentClone(
      rows,
      input.name ?? `${source.name} (copy)`,
      randomUUID,
    );

    if (!plan) {
      throw createCmsGraphqlError('NOT_FOUND', `No fragment "${input.uuid}"`);
    }

    const copy = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO fragments (uuid, name, is_system, properties, schema_uuid, typename)
         SELECT * FROM unnest($1::uuid[], $2::varchar[], $3::boolean[], $4::jsonb[], $5::uuid[], $6::varchar[])`,
        [
          plan.fragments.map((fragment) => fragment.uuid),
          plan.fragments.map((fragment) => fragment.name),
          plan.fragments.map((fragment) => fragment.isSystem),
          plan.fragments.map((fragment) => JSON.stringify(fragment.properties)),
          plan.fragments.map((fragment) => fragment.schemaUuid),
          plan.fragments.map((fragment) => fragment.typename),
        ],
      );

      if (plan.edges.length > 0) {
        await manager.query(
          `INSERT INTO fragments_children (fragment_uuid, children_uuid, sort_order)
           SELECT * FROM unnest($1::uuid[], $2::uuid[], $3::int[])`,
          [
            plan.edges.map((edge) => edge.parentUuid),
            plan.edges.map((edge) => edge.childUuid),
            plan.edges.map((edge) => edge.sortOrder),
          ],
        );
      }

      return manager.findOneOrFail(Fragment, {
        where: { uuid: plan.rootUuid },
      });
    });

    return toCmsFragmentObject(copy);
  }

  /**
   * @description The newest ACTIVE live schema for `typename`.
   * @throws GraphQLError BAD_USER_INPUT when the typename has none.
   */
  async findActiveSchema(typename: string): Promise<Schema> {
    const schema = await this.schemasRepository.findOne({
      order: { createdAt: 'DESC', uuid: 'DESC' },
      where: { status: CMS_STATUS.ACTIVE, typename },
    });

    if (!schema) {
      throw createCmsGraphqlError(
        'BAD_USER_INPUT',
        `No ACTIVE schema for typename "${typename}"`,
        { field: 'typename' },
      );
    }

    return schema;
  }

  /**
   * @description The schema's defaults with `overrides` on top, validated against it.
   * @throws GraphQLError BAD_USER_INPUT with `issues` when they do not validate.
   */
  buildValidProperties(
    schema: Schema,
    overrides: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const properties = {
      ...this.validation.getDefaults(schema.jsonSchema),
      ...overrides,
    };

    this.assertValid(schema, properties);

    return properties;
  }

  /**
   * @description Creates a fragment on its typename's newest ACTIVE schema, starting from the
   * schema defaults.
   */
  async create(input: CreateCmsFragmentInput): Promise<CmsFragmentObject> {
    const schema = await this.findActiveSchema(input.typename);
    const overrides = input.propertiesJson
      ? parseCmsJsonObject('propertiesJson', input.propertiesJson)
      : {};
    const properties = this.buildValidProperties(schema, overrides);
    const fragment = await this.fragmentsRepository.create({
      isSystem: false,
      name: input.name,
      properties,
      schemaUuid: schema.uuid,
      typename: schema.typename,
    });

    return toCmsFragmentObject(fragment);
  }

  /**
   * @description Renames a fragment and/or replaces its properties, validated against the
   * fragment's own schema version rather than the newest one.
   */
  async update(input: UpdateCmsFragmentInput): Promise<CmsFragmentObject> {
    const fragment = await this.findLive(input.uuid);
    const changes: { name?: string; properties?: Record<string, unknown> } = {};

    if (input.name !== null && input.name !== undefined) {
      changes.name = input.name;
    }

    if (input.propertiesJson !== null && input.propertiesJson !== undefined) {
      const properties = parseCmsJsonObject(
        'propertiesJson',
        input.propertiesJson,
      );
      const schema = await this.schemasRepository.findOne({
        where: { uuid: fragment.schemaUuid },
        withDeleted: true,
      });

      if (!schema) {
        throw createCmsGraphqlError(
          'CONFLICT',
          `Fragment "${fragment.uuid}" is pinned to schema "${fragment.schemaUuid}", which no longer exists`,
        );
      }

      this.assertValid(schema, properties);
      changes.properties = properties;
    }

    const saved = await this.fragmentsRepository.update(fragment.uuid, changes);

    return toCmsFragmentObject(saved);
  }

  /**
   * @description Soft deletes a fragment that nothing live references.
   * @throws GraphQLError CONFLICT while a live parent edge or a live layout root points at it.
   */
  async delete(uuid: string): Promise<CmsFragmentObject> {
    const fragment = await this.findLive(uuid);
    const [references] = await this.dataSource.query(
      `SELECT
         (SELECT count(*)::int FROM fragments_children c
            JOIN fragments p ON p.uuid = c.fragment_uuid AND p.is_deleted IS NOT TRUE
           WHERE c.children_uuid = $1) AS parents,
         (SELECT count(*)::int FROM layouts l
           WHERE l.fragment_uuid = $1 AND l.is_deleted IS NOT TRUE) AS layouts`,
      [uuid],
    );
    const parents: unknown = references?.parents;
    const layouts: unknown = references?.layouts;

    if (
      (typeof parents === 'number' && parents > 0) ||
      (typeof layouts === 'number' && layouts > 0)
    ) {
      throw createCmsGraphqlError(
        'CONFLICT',
        `Fragment "${uuid}" is still referenced by ${String(parents)} parent(s) and ${String(layouts)} layout(s)`,
        { layouts, parents },
      );
    }

    const removed = await this.fragmentsRepository.remove(fragment.uuid);

    return toCmsFragmentObject(removed);
  }

  /**
   * @description The live fragment with this uuid.
   * @throws GraphQLError NOT_FOUND when there is none.
   */
  async findLive(uuid: string): Promise<Fragment> {
    assertCmsUuid('fragment', uuid);

    const fragment = await this.fragmentsRepository.findOne({
      where: { uuid },
    });

    if (!fragment) {
      throw createCmsGraphqlError('NOT_FOUND', `No fragment "${uuid}"`);
    }

    return fragment;
  }

  /**
   * @description The rows a clone copies: the source alone, or its live tree (cut at the depth
   * cap, cycles not followed).
   */
  private async findCloneRows(
    source: Fragment,
    includeChildren: boolean,
  ): Promise<readonly CmsFragmentTreeRow[]> {
    if (!includeChildren) {
      return [
        {
          depth: 0,
          edgeCreatedAt: null,
          isSystem: source.isSystem === true,
          name: source.name,
          path: [source.uuid],
          position: 0,
          properties: source.properties,
          schemaUuid: source.schemaUuid,
          typename: source.typename,
          uuid: source.uuid,
        },
      ];
    }

    const tree = await this.fragmentsRepository.findTreeRows(source.uuid);

    if (!tree.ok) {
      throw createCmsGraphqlError(
        'BAD_USER_INPUT',
        `Fragment "${source.uuid}" has a subtree past the ${CMS_FRAGMENT_TREE_MAX_NODES}-node tree cap`,
      );
    }

    return tree.rows;
  }

  private assertValid(
    schema: Schema,
    properties: Readonly<Record<string, unknown>>,
  ): void {
    const result = this.validation.validate(
      schema.uuid,
      schema.jsonSchema,
      properties,
    );

    if (!result.ok) {
      throw createCmsGraphqlError(
        'BAD_USER_INPUT',
        `Properties do not match schema ${schema.typename}@${schema.version}`,
        { issues: result.issues, schemaUuid: schema.uuid },
      );
    }
  }
}

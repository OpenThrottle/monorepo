import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from './config/config.constants.ts';
import { CmsFragmentChildrenService } from './graphql/cms-fragment-children/cms-fragment-children.service.ts';
import { CmsFragmentsService } from './graphql/cms-fragments/cms-fragments.service.ts';
import { CmsLayoutsService } from './graphql/cms-layouts/cms-layouts.service.ts';
import { CmsProfilesService } from './graphql/cms-profiles/cms-profiles.service.ts';
import { FragmentsRepository } from './modules/fragments/fragments.repository.ts';
import { FragmentsChildrenService } from './modules/fragments-children/fragments-children.service.ts';
import { LayoutsRepository } from './modules/layouts/layouts.repository.ts';
import { LayoutsLibrariesService } from './modules/layouts-libraries/layouts-libraries.service.ts';
import { LibrariesRepository } from './modules/libraries/libraries.repository.ts';
import { LibraryComponentsRepository } from './modules/library-components/library-components.repository.ts';
import { ProfilesRepository } from './modules/profiles/profiles.repository.ts';
import { SchemasRepository } from './modules/schemas/schemas.repository.ts';
import { SurveysRepository } from './modules/surveys/surveys.repository.ts';
import { TagsRepository } from './modules/tags/tags.repository.ts';
import { NestjsRepositoriesCmsModule } from './nestjs-repositories-cms.module.ts';

/**
 * @description Boots the module against a real, migrated cms database and
 * reads one row from every table, so an entity that drifted from its SQL
 * (wrong column name or type) fails here rather than at runtime. Opt-in,
 * because it needs a live Postgres:
 *
 *   pnpm run database:migrate -- --database cms
 *   OT_CMS_DB_INTEGRATION=true pnpm nx run nestjs-repositories-cms:test \
 *     -- src/nestjs-repositories-cms.module.integration.test.ts
 *
 * The connection comes from CMS_POSTGRES_URL, else POSTGRES_URL / POSTGRES_*.
 */

/** A TypeORM column's metadata, without reaching into typeorm's internals. */
type EntityColumn = DataSource['entityMetadatas'][number]['columns'][number];

interface DbColumn {
  readonly column_name: string;
  readonly data_type: string;
  readonly is_nullable: 'NO' | 'YES';
  readonly table_name: string;
  readonly udt_name: string;
}

/**
 * @description The information_schema type a TypeORM column should have:
 * enums and arrays report a generic data_type, so they compare on udt_name.
 */
function expectedDbType(column: EntityColumn): string {
  if (column.enumName) {
    return `USER-DEFINED:${column.enumName}`;
  }
  if (column.isArray) {
    return 'ARRAY';
  }
  return String(column.type);
}

/** @description The comparable type of a live column, in {@link expectedDbType}'s terms. */
function actualDbType(column: DbColumn): string {
  if (column.data_type === 'USER-DEFINED') {
    return `USER-DEFINED:${column.udt_name}`;
  }
  return column.data_type;
}

const ENABLED = process.env.OT_CMS_DB_INTEGRATION === 'true';

/** Join tables that do not fit BaseUuidModel keep a thin service. */
const SERVICES = [FragmentsChildrenService, LayoutsLibrariesService];

/** Tables on BaseRepository (uuid + is_deleted). */
const REPOSITORIES = [
  FragmentsRepository,
  LayoutsRepository,
  LibrariesRepository,
  LibraryComponentsRepository,
  ProfilesRepository,
  SchemasRepository,
  SurveysRepository,
  TagsRepository,
];

describe.skipIf(!ENABLED)('NestjsRepositoriesCmsModule (live cms DB)', () => {
  let app: Awaited<
    ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>
  >;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [NestjsRepositoriesCmsModule],
    }).compile();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('every entity column matches the live table (name, type, nullability)', async () => {
    const dataSource = app.get<DataSource>(getDataSourceToken(CMS_CONNECTION));
    const live: DbColumn[] = await dataSource.query(
      `SELECT table_name, column_name, data_type, udt_name, is_nullable
         FROM information_schema.columns
        WHERE table_schema = 'public'`,
    );
    const liveByKey = new Map(
      live.map((column) => [
        `${column.table_name}.${column.column_name}`,
        column,
      ]),
    );

    const mismatches = dataSource.entityMetadatas.flatMap((entity) => {
      return entity.columns.flatMap((column) => {
        const key = `${entity.tableName}.${column.databaseName}`;
        const actual = liveByKey.get(key);
        if (!actual) {
          return [`${key}: missing in the database`];
        }
        const problems: string[] = [];
        const expectedType = expectedDbType(column);
        if (actualDbType(actual) !== expectedType) {
          problems.push(
            `${key}: type ${actualDbType(actual)} != ${expectedType}`,
          );
        }
        if ((actual.is_nullable === 'YES') !== column.isNullable) {
          problems.push(
            `${key}: nullable ${actual.is_nullable} != ${String(column.isNullable)}`,
          );
        }
        return problems;
      });
    });

    expect(mismatches).toEqual([]);
  });

  it.each(SERVICES.map((service) => [service.name, service] as const))(
    '%s reads its table',
    async (_name, service) => {
      const rows = await app.get(service).getRepository().find({ take: 1 });

      expect(Array.isArray(rows)).toBe(true);
    },
  );

  it.each(
    REPOSITORIES.map((repository) => [repository.name, repository] as const),
  )('%s pages its live rows', async (_name, repository) => {
    const page = await app.get(repository).findByPaginated({ take: 1 });

    expect(Array.isArray(page.data)).toBe(true);
  });

  it('soft deletes through is_deleted and treats NULL as live', async () => {
    const tags = app.get(TagsRepository);
    const dataSource = app.get<DataSource>(getDataSourceToken(CMS_CONNECTION));
    const name = `integration-${Date.now()}`;
    const [deleted, nullFlag] = await tags.createMany([
      { description: 'soft delete round trip', name: `${name}-a` },
      { description: 'NULL is_deleted', name: `${name}-b` },
    ]);

    try {
      if (!deleted || !nullFlag) {
        throw new Error('createMany returned fewer rows than it was given');
      }
      await dataSource.query(
        `UPDATE tags SET is_deleted = NULL WHERE uuid = $1`,
        [nullFlag.uuid],
      );

      await expect(tags.findById(nullFlag.uuid)).resolves.toMatchObject({
        isDeleted: null,
      });
      await expect(tags.remove(deleted.uuid)).resolves.toMatchObject({
        isDeleted: true,
        uuid: deleted.uuid,
      });
      await expect(tags.findById(deleted.uuid)).rejects.toThrow(
        NotFoundException,
      );
      await expect(tags.remove(deleted.uuid)).rejects.toThrow(
        NotFoundException,
      );
      await expect(tags.removeMany({ name: `${name}-b` })).resolves.toEqual({
        removedCount: 1,
      });
    } finally {
      await dataSource.query(`DELETE FROM tags WHERE name LIKE $1`, [
        `${name}-%`,
      ]);
    }
  });

  it('reads a layout tree in pre-order, cutting cycles and soft-deleted fragments', async () => {
    const dataSource = app.get<DataSource>(getDataSourceToken(CMS_CONNECTION));
    const layouts = app.get(CmsLayoutsService);
    const [layout] = await dataSource.query(
      `SELECT uuid, slug, fragment_uuid FROM layouts WHERE is_deleted IS NOT TRUE LIMIT 1`,
    );

    if (!layout) {
      throw new Error('no live layout; run the cms seed first');
    }

    const root: string = layout.fragment_uuid;
    const [extra] = await dataSource.query(
      `INSERT INTO fragments (name, schema_uuid, typename)
         SELECT 'integration-cycle', schema_uuid, typename FROM fragments WHERE uuid = $1
       RETURNING uuid`,
      [root],
    );
    const extraUuid: string = extra.uuid;

    try {
      // root -> extra -> root (a cycle) and extra -> extra (a self-loop).
      await dataSource.query(
        `INSERT INTO fragments_children (fragment_uuid, children_uuid, sort_order)
           VALUES ($1, $2, 32000), ($2, $1, 0), ($2, $2, 1)`,
        [root, extraUuid],
      );

      const read = await layouts.findBySlug(layout.slug);
      const fragments = read?.fragments ?? [];
      const keys = new Set(fragments.map((node) => node.key));

      expect(fragments[0]?.uuid).toBe(root);
      expect(fragments.filter((node) => node.uuid === extraUuid)).toHaveLength(
        1,
      );
      expect(fragments.filter((node) => node.uuid === root)).toHaveLength(1);
      const rootChildKeys = fragments[0]?.childKeys ?? [];

      expect(rootChildKeys[rootChildKeys.length - 1]).toBe(
        `${root}/${extraUuid}`,
      );
      for (const node of fragments) {
        expect(node.childKeys.every((key) => keys.has(key))).toBe(true);
      }

      await dataSource.query(
        `UPDATE fragments SET is_deleted = true WHERE uuid = $1`,
        [extraUuid],
      );
      const afterDelete = await layouts.findByUuid(layout.uuid);

      expect(
        afterDelete?.fragments.some((node) => node.uuid === extraUuid),
      ).toBe(false);
    } finally {
      await dataSource.query(
        `DELETE FROM fragments_children WHERE fragment_uuid = $1 OR children_uuid = $1`,
        [extraUuid],
      );
      await dataSource.query(`DELETE FROM fragments WHERE uuid = $1`, [
        extraUuid,
      ]);
    }
  });

  it('writes layouts, fragments and edges transactionally with the documented refusals', async () => {
    const dataSource = app.get<DataSource>(getDataSourceToken(CMS_CONNECTION));
    const layouts = app.get(CmsLayoutsService);
    const fragments = app.get(CmsFragmentsService);
    const children = app.get(CmsFragmentChildrenService);
    const slug = `integration-${Date.now()}`;
    const created: string[] = [];

    try {
      const layout = await layouts.create({ name: 'Integration', slug });
      created.push(layout.fragmentUuid);

      await expect(
        layouts.create({ name: 'Again', slug }),
      ).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });

      const [root] = await dataSource.query(
        `SELECT is_system FROM fragments WHERE uuid = $1`,
        [layout.fragmentUuid],
      );

      expect(root?.is_system).toBe(true);

      const draftTypename = `IntegrationDraft${Date.now()}`;
      const deletedTypename = `IntegrationDeleted${Date.now()}`;

      try {
        await dataSource.query(
          `INSERT INTO schemas (typename, version, status, is_deleted) VALUES
             ($1, '1', 'DRAFT', false),
             ($2, '1', 'ACTIVE', true),
             ('Heading', $3, 'ACTIVE', false)`,
          [draftTypename, deletedTypename, `integration-${Date.now()}`],
        );

        const available = await layouts.findAvailableTypenames(layout.uuid);

        expect(available).toEqual(
          expect.arrayContaining(['Button', 'Heading']),
        );
        expect(available).not.toContain('Layout');
        expect(available).not.toContain(draftTypename);
        expect(available).not.toContain(deletedTypename);
        expect(new Set(available).size).toBe(available.length);
        expect(available).toEqual([...available].sort());
      } finally {
        await dataSource.query(
          `DELETE FROM schemas WHERE typename = ANY($1::text[]) OR version LIKE 'integration-%'`,
          [[draftTypename, deletedTypename]],
        );
      }

      const heading = await fragments.create({
        name: 'h',
        propertiesJson: '{"copy":"Hi","heading":"h1"}',
        typename: 'Heading',
      });
      const button = await fragments.create({
        name: 'b',
        propertiesJson: '{"cta":"Go"}',
        typename: 'Button',
      });
      created.push(heading.uuid, button.uuid);

      await expect(
        fragments.create({
          name: 'bad',
          propertiesJson: '{"copy":"Hi","heading":"h9"}',
          typename: 'Heading',
        }),
      ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });

      await children.add(layout.fragmentUuid, heading.uuid, null);
      await expect(
        children.add(layout.fragmentUuid, button.uuid, null),
      ).resolves.toMatchObject({ sortOrder: 1 });
      await expect(
        children.add(heading.uuid, layout.fragmentUuid, null),
      ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
      await expect(
        children.add(layout.fragmentUuid, heading.uuid, null),
      ).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
      await expect(
        children.reorder(layout.fragmentUuid, [button.uuid]),
      ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });

      await children.reorder(layout.fragmentUuid, [button.uuid, heading.uuid]);

      const tree = await layouts.findBySlug(slug);

      expect(tree?.fragments.map((node) => node.uuid)).toEqual([
        layout.fragmentUuid,
        button.uuid,
        heading.uuid,
      ]);

      const copy = await fragments.clone({
        includeChildren: true,
        name: null,
        uuid: layout.fragmentUuid,
      });
      const copyEdges: unknown = await dataSource.query(
        `SELECT children_uuid FROM fragments_children WHERE fragment_uuid = $1`,
        [copy.uuid],
      );
      const copyChildUuids = (Array.isArray(copyEdges) ? copyEdges : []).map(
        (row) => String(Reflect.get(Object(row), 'children_uuid')),
      );

      created.push(copy.uuid, ...copyChildUuids);
      expect(copy).toMatchObject({
        isSystem: false,
        name: 'Integration (copy)',
        schemaUuid: tree?.fragments[0]?.schemaUuid,
      });
      expect(copyChildUuids).toHaveLength(2);
      expect(copyChildUuids).not.toContain(heading.uuid);

      const [copiedHeading] = await dataSource.query(
        `SELECT f.properties FROM fragments_children c
           JOIN fragments f ON f.uuid = c.children_uuid
          WHERE c.fragment_uuid = $1 AND f.typename = 'Heading'`,
        [copy.uuid],
      );

      expect(copiedHeading?.properties).toEqual({ copy: 'Hi', heading: 'h1' });

      const headings = await fragments.findPage({
        isSystem: false,
        skip: 0,
        take: 100,
        typename: 'Heading',
      });

      expect(headings.items.map((item) => item.uuid)).toContain(heading.uuid);
      expect(headings.items.every((item) => item.typename === 'Heading')).toBe(
        true,
      );

      await expect(fragments.delete(heading.uuid)).rejects.toMatchObject({
        extensions: { code: 'CONFLICT' },
      });
      await children.remove(layout.fragmentUuid, heading.uuid);
      await expect(fragments.delete(heading.uuid)).resolves.toMatchObject({
        uuid: heading.uuid,
      });

      await layouts.delete(layout.uuid);
      await expect(layouts.findBySlug(slug)).resolves.toBeNull();

      const [rootAfter] = await dataSource.query(
        `SELECT is_deleted FROM fragments WHERE uuid = $1`,
        [layout.fragmentUuid],
      );

      expect(rootAfter?.is_deleted).toBe(true);
    } finally {
      await dataSource.query(`DELETE FROM layouts WHERE slug = $1`, [slug]);
      await dataSource.query(
        `DELETE FROM fragments_children WHERE fragment_uuid = ANY($1::uuid[]) OR children_uuid = ANY($1::uuid[])`,
        [created],
      );
      await dataSource.query(
        `DELETE FROM fragments WHERE uuid = ANY($1::uuid[])`,
        [created],
      );
    }
  });

  it('resolves one profile per OpenThrottle user, restoring a soft-deleted one', async () => {
    const dataSource = app.get<DataSource>(getDataSourceToken(CMS_CONNECTION));
    const profiles = app.get(CmsProfilesService);
    const userId = '0b9a4f1e-5c3d-4e2a-9f10-0000000000aa';

    try {
      const first = await profiles.resolveForUser({
        email: null,
        kind: 'user',
        userId,
      });
      const [again, raced] = await Promise.all([
        profiles.resolveForUser({
          email: 'x@example.test',
          kind: 'user',
          userId,
        }),
        profiles.resolveForUser({
          email: 'x@example.test',
          kind: 'user',
          userId,
        }),
      ]);

      expect(first.openthrottleUserId).toBe(userId);
      expect(first.email).toBe(`${userId}@openthrottle.invalid`);
      expect(again.uuid).toBe(first.uuid);
      expect(raced.uuid).toBe(first.uuid);

      await dataSource.query(
        `UPDATE profiles SET is_deleted = true WHERE uuid = $1`,
        [first.uuid],
      );

      const restored = await profiles.resolveForUser({
        email: null,
        kind: 'user',
        userId,
      });

      expect(restored.uuid).toBe(first.uuid);
      expect(restored.isDeleted).toBe(false);
    } finally {
      await dataSource.query(
        `DELETE FROM profiles WHERE openthrottle_user_id = $1`,
        [userId],
      );
    }
  });
});

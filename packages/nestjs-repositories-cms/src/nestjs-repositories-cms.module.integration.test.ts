import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from './config/config.constants.ts';
import { FragmentsService } from './modules/fragments/fragments.service.ts';
import { FragmentsChildrenService } from './modules/fragments-children/fragments-children.service.ts';
import { LayoutsService } from './modules/layouts/layouts.service.ts';
import { LayoutsLibrariesService } from './modules/layouts-libraries/layouts-libraries.service.ts';
import { LibrariesService } from './modules/libraries/libraries.service.ts';
import { LibraryComponentsService } from './modules/library-components/library-components.service.ts';
import { ProfilesService } from './modules/profiles/profiles.service.ts';
import { SchemasService } from './modules/schemas/schemas.service.ts';
import { SurveysService } from './modules/surveys/surveys.service.ts';
import { TagsService } from './modules/tags/tags.service.ts';
import { NestjsRepositoriesCmsModule } from './nestjs-repositories-cms.module.ts';

/**
 * @description Boots the module against a real, migrated cms database and
 * reads one row from every table, so an entity that drifted from its SQL
 * (wrong column name or type) fails here rather than at runtime. Opt-in,
 * because it needs a live Postgres:
 *
 *   pnpm run database:migrate -- --database cms
 *   OT_CMS_DB_INTEGRATION=true pnpm nx run nestjs-repositories-cms:test \
 *     --testFile=src/nestjs-repositories-cms.module.integration.test.ts
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

const SERVICES = [
  FragmentsChildrenService,
  FragmentsService,
  LayoutsLibrariesService,
  LayoutsService,
  LibrariesService,
  LibraryComponentsService,
  ProfilesService,
  SchemasService,
  SurveysService,
  TagsService,
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
});

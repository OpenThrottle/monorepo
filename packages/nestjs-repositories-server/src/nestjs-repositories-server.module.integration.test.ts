import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { NotesRepository } from './modules/notes/notes.repository.ts';
import { RolesRepository } from './modules/roles/roles.repository.ts';
import { ServiceAccountCredentialsRepository } from './modules/service-account-credentials/service-account-credentials.repository.ts';
import { ServiceAccountsRepository } from './modules/service-accounts/service-accounts.repository.ts';
import { UsersRepository } from './modules/users/users.repository.ts';
import { NestjsRepositoriesServerModule } from './nestjs-repositories-server.module.ts';

/**
 * @description Boots the module against a real, migrated openthrottle database
 * and checks every entity this package owns against its live table, so an
 * entity that drifted from its SQL (wrong column name, type or nullability)
 * fails here rather than at runtime. Opt-in, because it needs a live Postgres:
 *
 *   pnpm run database:migrate -- --database openthrottle
 *   pnpm run database:test:openthrottle
 *
 * which is:
 *
 *   POSTGRES_HOST=localhost OT_OPENTHROTTLE_DB_INTEGRATION=true \
 *     pnpm nx run @openthrottle/nestjs-repositories-server:test --skip-nx-cache \
 *     -- src/nestjs-repositories-server.module.integration.test.ts
 *
 * The app's real DataSource still lives in `nestjs-repositories`, which
 * depends on this package, so the suite registers its own default DataSource
 * with `autoLoadEntities`: exactly the entities this package's modules declare.
 * The connection comes from POSTGRES_URL / POSTGRES_*. Nx loads the root
 * `.env`, whose POSTGRES_HOST is `host.docker.internal` and does not resolve on
 * the host, so a host run overrides it.
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
 * @description Postgres type aliases an entity may declare, mapped to the name
 * information_schema reports (`BaseModel` declares `timestamptz`). pgvector's `vector` is an
 * extension type, so information_schema reports it as USER-DEFINED with udt_name `vector`.
 */
const TYPE_ALIASES: Readonly<Record<string, string>> = {
  int: 'integer',
  timestamptz: 'timestamp with time zone',
  varchar: 'character varying',
  vector: 'USER-DEFINED:vector',
};

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
  const declared = String(column.type);
  return TYPE_ALIASES[declared] ?? declared;
}

/** @description The comparable type of a live column, in {@link expectedDbType}'s terms. */
function actualDbType(column: DbColumn): string {
  if (column.data_type === 'USER-DEFINED') {
    return `USER-DEFINED:${column.udt_name}`;
  }
  return column.data_type;
}

const ENABLED = process.env.OT_OPENTHROTTLE_DB_INTEGRATION === 'true';

describe.skipIf(!ENABLED)(
  'NestjsRepositoriesServerModule (live openthrottle DB)',
  () => {
    /** Unset when `beforeAll` fails, so `afterAll` must not assume it. */
    let app: TestingModule | undefined;

    /** @description The booted module; only reached after `beforeAll` succeeded. */
    const requireApp = (): TestingModule => {
      if (!app) {
        throw new Error(
          'openthrottle test module did not boot; see the beforeAll error',
        );
      }
      return app;
    };

    beforeAll(async () => {
      app = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            autoLoadEntities: true,
            type: 'postgres',
            url: getPostgresUrl(),
          }),
          NestjsRepositoriesServerModule,
        ],
      }).compile();
      await app.init();
    });

    afterAll(async () => {
      await app?.close();
    });

    it('every entity column matches the live table (name, type, nullability)', async () => {
      const dataSource = requireApp().get<DataSource>(getDataSourceToken());
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

      expect(dataSource.entityMetadatas.length).toBeGreaterThan(0);

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

    it('soft deletes notes through deleted_at', async () => {
      const notes = requireApp().get(NotesRepository);
      const dataSource = requireApp().get<DataSource>(getDataSourceToken());
      const marker = `integration-${Date.now()}`;
      const [single, bulk] = await notes.createMany([
        { author: null, content: `${marker}-a` },
        { author: null, content: `${marker}-b` },
      ]);

      try {
        if (!single || !bulk) {
          throw new Error('createMany returned fewer rows than it was given');
        }

        const removed = await notes.remove(single.id);

        expect(removed.id).toBe(single.id);
        expect(removed.deletedAt).toBeInstanceOf(Date);
        await expect(notes.findById(single.id)).rejects.toThrow(
          NotFoundException,
        );
        await expect(notes.remove(single.id)).rejects.toThrow(
          NotFoundException,
        );
        await expect(
          notes.removeMany({ content: `${marker}-b` }),
        ).resolves.toEqual({ removedCount: 1 });

        const listed = await notes.findAllNewestFirst();

        expect(listed.some((note) => note.content.startsWith(marker))).toBe(
          false,
        );

        const kept: { readonly deleted: boolean }[] = await dataSource.query(
          `SELECT deleted_at IS NOT NULL AS deleted FROM notes WHERE content LIKE $1`,
          [`${marker}-%`],
        );

        expect(kept).toEqual([{ deleted: true }, { deleted: true }]);
      } finally {
        await dataSource.query(`DELETE FROM notes WHERE content LIKE $1`, [
          `${marker}-%`,
        ]);
      }
    });

    it('grants nothing through a soft-deleted role', async () => {
      const users = requireApp().get(UsersRepository);
      const roles = requireApp().get(RolesRepository);
      const accounts = requireApp().get(ServiceAccountsRepository);
      const dataSource = requireApp().get<DataSource>(getDataSourceToken());
      const marker = `integration-${Date.now()}`;

      try {
        const user = await users.create({ githubUsername: `${marker}-user` });
        const account = await accounts.create({ name: `${marker}-account` });
        const role = await roles.create({ name: `${marker}-role` });

        await expect(roles.assignRoleToUser(user.id, role.id)).resolves.toBe(
          true,
        );
        await expect(
          roles.assignRoleToServiceAccount(account.id, role.id),
        ).resolves.toBe(true);
        await expect(roles.findRoleNamesByUserId(user.id)).resolves.toEqual([
          `${marker}-role`,
        ]);

        await roles.remove(role.id);

        await expect(roles.findRoleNamesByUserId(user.id)).resolves.toEqual([]);
        await expect(roles.findRolesForUser(user.id)).resolves.toEqual([]);
        await expect(
          roles.findRoleNamesByServiceAccountId(account.id),
        ).resolves.toEqual([]);
        await expect(roles.assignRoleToUser(user.id, role.id)).resolves.toBe(
          false,
        );
      } finally {
        await dataSource.query(
          `DELETE FROM users WHERE github_username LIKE $1`,
          [`${marker}-%`],
        );
        await dataSource.query(
          `DELETE FROM service_accounts WHERE name LIKE $1`,
          [`${marker}-%`],
        );
        await dataSource.query(`DELETE FROM roles WHERE name LIKE $1`, [
          `${marker}-%`,
        ]);
      }
    });

    it('stops verifying a service account token once the account is soft deleted', async () => {
      const accounts = requireApp().get(ServiceAccountsRepository);
      const credentials = requireApp().get(ServiceAccountCredentialsRepository);
      const dataSource = requireApp().get<DataSource>(getDataSourceToken());
      const marker = `integration-${Date.now()}`;

      try {
        const account = await accounts.create({ name: `${marker}-account` });
        const issued = await credentials.createCredential({
          serviceAccountId: account.id,
        });

        if (issued == null) {
          throw new Error('createCredential returned null for a live account');
        }

        await expect(
          credentials.verifyBearerToken(issued.token),
        ).resolves.toEqual({
          credentialId: issued.credential.id,
          serviceAccountId: account.id,
        });

        await accounts.remove(account.id);

        await expect(
          credentials.verifyBearerToken(issued.token),
        ).resolves.toBeNull();
        await expect(
          credentials.createCredential({ serviceAccountId: account.id }),
        ).resolves.toBeNull();
      } finally {
        await dataSource.query(
          `DELETE FROM service_accounts WHERE name LIKE $1`,
          [`${marker}-%`],
        );
      }
    });
  },
);

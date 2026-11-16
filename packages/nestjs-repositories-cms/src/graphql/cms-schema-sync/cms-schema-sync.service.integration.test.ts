import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { NestjsRepositoriesCmsModule } from '../../nestjs-repositories-cms.module.ts';
import { CmsSchemaSyncService } from './cms-schema-sync.service.ts';
import { getCmsSchemaVersion } from './cms-schema-sync.utils.ts';

/**
 * @description The schema sync against a real, migrated cms database (migration 013 included).
 * Opt-in like the module's integration test (`pnpm run database:test:cms`). It syncs only
 * throwaway typenames from a temp manifest folder, and removes its rows afterwards, so the real
 * block schemas are never touched.
 */

const ENABLED = process.env.OT_CMS_DB_INTEGRATION === 'true';

interface SchemaRow {
  readonly status: string;
  readonly uuid: string;
  readonly version: string;
}

describe.skipIf(!ENABLED)('CmsSchemaSyncService (live cms DB)', () => {
  const suffix = randomUUID().slice(0, 8);
  const typename = `SyncSpecHero${suffix}`;
  const other = `SyncSpecCard${suffix}`;
  let app: TestingModule | undefined;
  let dir = '';

  const dataSource = (): DataSource => {
    if (!app) {
      throw new Error('cms test module did not boot; see the beforeAll error');
    }
    return app.get<DataSource>(getDataSourceToken(CMS_CONNECTION));
  };

  /** Writes a manifest for both typenames; `title` changes Hero's schema, and so its version. */
  const writeManifest = (title: string): string => {
    const hero = { additionalProperties: false, properties: { title: { default: title, type: 'string' } }, type: 'object' }; // prettier-ignore
    const card = { additionalProperties: false, properties: {}, type: 'object' }; // prettier-ignore
    const packageDir = join(dir, 'blocks');

    rmSync(packageDir, { force: true, recursive: true });
    mkdirSync(packageDir);
    writeFileSync(join(packageDir, 'Hero.schema.json'), JSON.stringify(hero));
    writeFileSync(join(packageDir, 'Card.schema.json'), JSON.stringify(card));
    writeFileSync(
      join(packageDir, 'manifest.json'),
      JSON.stringify({
        schemas: [
          { file: 'Card.schema.json', typename: other, version: getCmsSchemaVersion(card) }, // prettier-ignore
          { file: 'Hero.schema.json', typename, version: getCmsSchemaVersion(hero) }, // prettier-ignore
        ],
      }),
    );

    return getCmsSchemaVersion(hero);
  };

  const heroRows = async (): Promise<SchemaRow[]> => {
    return dataSource().query(
      `SELECT uuid, version, status FROM schemas WHERE typename = $1 ORDER BY created_at, uuid`,
      [typename],
    );
  };

  const sync = async () => {
    return new CmsSchemaSyncService(dataSource(), dir).sync();
  };

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'cms-schema-sync-live-'));
    app = await Test.createTestingModule({
      imports: [NestjsRepositoriesCmsModule],
    }).compile();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await dataSource().query(
        `DELETE FROM fragments WHERE typename = ANY($1)`,
        [[typename, other]],
      );
      await dataSource().query(`DELETE FROM schemas WHERE typename = ANY($1)`, [
        [typename, other],
      ]);
    }
    await app?.close();
    rmSync(dir, { force: true, recursive: true });
  });

  it('first sync inserts every block, a second is a no-op, a change adds a version', async () => {
    const v1 = writeManifest('one');

    const first = await sync();

    expect(first).toMatchObject({
      ok: true,
      result: { disabled: [], total: 2 },
    });
    expect(first.ok ? first.result.inserted : []).toEqual([
      `${other}@${getCmsSchemaVersion({ additionalProperties: false, properties: {}, type: 'object' })}`, // prettier-ignore
      `${typename}@${v1}`,
    ]);

    const [original] = await heroRows();

    if (!original) {
      throw new Error('the first sync inserted no Hero row');
    }
    await dataSource().query(
      `INSERT INTO fragments (name, schema_uuid, typename) VALUES ('pinned', $1, $2)`,
      [original.uuid, typename],
    );

    const second = await sync();

    expect(second).toEqual({ ok: true, result: { activated: [], disabled: [], inserted: [], total: 2 } }); // prettier-ignore

    const v2 = writeManifest('two');
    const third = await sync();

    expect(third).toEqual({ ok: true, result: { activated: [], disabled: [`${typename}@${v1}`], inserted: [`${typename}@${v2}`], total: 2 } }); // prettier-ignore
    expect(await heroRows()).toEqual([
      { status: 'DISABLED', uuid: original.uuid, version: v1 },
      expect.objectContaining({ status: 'ACTIVE', version: v2 }),
    ]);

    const pinned: { schema_uuid: string }[] = await dataSource().query(
      `SELECT schema_uuid FROM fragments WHERE typename = $1`,
      [typename],
    );

    expect(pinned).toEqual([{ schema_uuid: original.uuid }]);
  });

  it('re-activates an older version when the manifest goes back to it', async () => {
    const v1 = writeManifest('one');

    const outcome = await sync();

    expect(outcome.ok ? outcome.result : null).toMatchObject({
      activated: [`${typename}@${v1}`],
      inserted: [],
    });
    expect((await heroRows()).map((row) => row.status)).toEqual(['ACTIVE', 'DISABLED']); // prettier-ignore
  });
});

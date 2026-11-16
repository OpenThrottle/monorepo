import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMock } from '@golevelup/ts-vitest';
import type { DataSource, QueryRunner } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CmsSchemaSyncService } from './cms-schema-sync.service.ts';
import { getCmsSchemaVersion } from './cms-schema-sync.utils.ts';

const HERO_SCHEMA = { additionalProperties: false, properties: {}, type: 'object' }; // prettier-ignore

const writeManifest = (dir: string): string => {
  const version = getCmsSchemaVersion(HERO_SCHEMA);
  const packageDir = join(dir, 'blocks');

  mkdirSync(packageDir);
  writeFileSync(join(packageDir, 'Hero.schema.json'), JSON.stringify(HERO_SCHEMA)); // prettier-ignore
  writeFileSync(
    join(packageDir, 'manifest.json'),
    JSON.stringify({ schemas: [{ file: 'Hero.schema.json', typename: 'Hero', version }] }), // prettier-ignore
  );

  return version;
};

/** A query runner that answers each statement from `answers`, in call order after the lock. */
const buildService = (dir: string, answers: readonly unknown[][]) => {
  const runner = createMock<QueryRunner>();
  const queue = [...answers];

  Reflect.set(runner, 'isTransactionActive', true);
  vi.mocked(runner.query).mockImplementation(async (sql: string) => {
    if (sql.includes('pg_advisory_xact_lock')) {
      return [];
    }

    const records = queue.shift();

    if (records === undefined) {
      throw new Error('relation "schemas" does not exist');
    }

    return { affected: records.length, records };
  });

  const dataSource = createMock<DataSource>();

  vi.mocked(dataSource.createQueryRunner).mockReturnValue(runner);

  return { runner, service: new CmsSchemaSyncService(dataSource, dir) };
};

describe('CmsSchemaSyncService', () => {
  let dir = '';

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cms-schema-sync-service-'));
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
  });

  describe('sync', () => {
    it('reports what the insert / activate / disable statements returned', async () => {
      const version = writeManifest(dir);
      const { runner, service } = buildService(dir, [
        [{ typename: 'Hero', version }],
        [],
        [{ typename: 'Hero', version: 'old' }],
      ]);

      const outcome = await service.sync();

      expect(outcome).toEqual({
        ok: true,
        result: {
          activated: [],
          disabled: ['Hero@old'],
          inserted: [`Hero@${version}`],
          total: 1,
        },
      });
      expect(runner.commitTransaction).toHaveBeenCalled();
      expect(runner.release).toHaveBeenCalled();
    });

    it('takes the advisory lock and inserts with ON CONFLICT, never DELETE', async () => {
      writeManifest(dir);
      const { runner, service } = buildService(dir, [[], [], []]);

      await service.sync();

      const statements = vi.mocked(runner.query).mock.calls.map(([sql]) => sql); // prettier-ignore

      expect(statements[0]).toContain('pg_advisory_xact_lock');
      expect(statements[1]).toContain('ON CONFLICT (typename, version)');
      expect(statements.join('\n')).not.toMatch(/\bDELETE\b/);
    });

    it('rolls back and returns the error when a statement fails', async () => {
      writeManifest(dir);
      const { runner, service } = buildService(dir, [[]]);

      const outcome = await service.sync();

      expect(outcome).toEqual({ error: 'relation "schemas" does not exist', ok: false }); // prettier-ignore
      expect(runner.rollbackTransaction).toHaveBeenCalled();
      expect(runner.commitTransaction).not.toHaveBeenCalled();
      expect(runner.release).toHaveBeenCalled();
    });

    it('fails without touching the database when there is no manifest', async () => {
      const { runner, service } = buildService(join(dir, 'missing'), []);

      const outcome = await service.sync();

      expect(outcome.ok).toBe(false);
      expect(runner.connect).not.toHaveBeenCalled();
    });
  });

  describe('onApplicationBootstrap', () => {
    it('never throws when the sync fails, so the server keeps booting', async () => {
      const { service } = buildService(join(dir, 'missing'), []);

      await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    });
  });
});

import type { OnApplicationBootstrap } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import {
  CMS_SCHEMA_MANIFESTS_DIR,
  CMS_SCHEMA_SYNC_LOCK_KEY,
} from './cms-schema-sync.constants.ts';
import type {
  CmsSchemaSyncEntry,
  CmsSchemaSyncOutcome,
} from './cms-schema-sync.types.ts';
import {
  describeCmsSchemaSync,
  readCmsSchemaManifests,
} from './cms-schema-sync.utils.ts';

const ENTRIES_CTE = `
  WITH entries AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS e(json_schema jsonb, typename text, version text)
  )`;

/** A new (typename, version) inserts as ACTIVE; an existing live one is left alone. */
const INSERT_MISSING = `${ENTRIES_CTE}
  INSERT INTO schemas (json_schema, status, typename, version)
  SELECT e.json_schema, 'ACTIVE', e.typename, e.version FROM entries e
  ON CONFLICT (typename, version) WHERE is_deleted IS NOT TRUE DO NOTHING
  RETURNING typename, version`;

/** The manifest's version is the ACTIVE one, even when it was disabled earlier (a rollback). */
const ACTIVATE_CURRENT = `${ENTRIES_CTE}
  UPDATE schemas s SET status = 'ACTIVE' FROM entries e
  WHERE s.typename = e.typename AND s.version = e.version AND s.is_deleted IS NOT TRUE
    AND s.status IS DISTINCT FROM 'ACTIVE'
  RETURNING s.typename, s.version`;

/** Every other ACTIVE version of a synced typename goes DISABLED; its fragments keep it. */
const DISABLE_OTHERS = `${ENTRIES_CTE}
  UPDATE schemas s SET status = 'DISABLED' FROM entries e
  WHERE s.typename = e.typename AND s.version <> e.version AND s.is_deleted IS NOT TRUE
    AND s.status = 'ACTIVE'
  RETURNING s.typename, s.version`;

function toLabels(records: unknown): string[] {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .map((record: unknown) => {
      const typename = Reflect.get(Object(record), 'typename');
      const version = Reflect.get(Object(record), 'version');

      return `${String(typename)}@${String(version)}`;
    })
    .sort();
}

/**
 * @description Fills the cms `schemas` table from the generated block manifests, append-only: a
 * new `(typename, version)` inserts one ACTIVE row, the other ACTIVE versions of that typename go
 * DISABLED, and nothing is ever deleted, so fragments keep their pinned `schema_uuid`. Re-running
 * with unchanged manifests changes nothing. Runs once on every boot and on demand through the
 * `syncCmsSchemas` mutation. A failure is logged and returned, never thrown: the API keeps
 * serving.
 * @public
 */
@Injectable()
export class CmsSchemaSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CmsSchemaSyncService.name);

  constructor(
    @InjectDataSource(CMS_CONNECTION) private readonly dataSource: DataSource,
    @Inject(CMS_SCHEMA_MANIFESTS_DIR) private readonly manifestsDir: string,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sync();
  }

  /**
   * @description Reads the manifests and applies them in one transaction, under an advisory lock
   * so replicas booting together (and a local seed) serialize. Logs the outcome either way.
   */
  async sync(): Promise<CmsSchemaSyncOutcome> {
    const read = readCmsSchemaManifests(this.manifestsDir);
    const outcome: CmsSchemaSyncOutcome = read.ok
      ? await this.apply(read.entries)
      : { error: read.error, ok: false };

    if (outcome.ok) {
      this.logger.log(describeCmsSchemaSync(outcome.result));
    } else {
      this.logger.error(`CMS schema sync failed: ${outcome.error}`);
    }

    return outcome;
  }

  private async apply(
    entries: readonly CmsSchemaSyncEntry[],
  ): Promise<CmsSchemaSyncOutcome> {
    const payload = JSON.stringify(
      entries.map((entry) => {
        return {
          json_schema: entry.jsonSchema,
          typename: entry.typename,
          version: entry.version,
        };
      }),
    );
    const runner = this.dataSource.createQueryRunner();

    try {
      await runner.connect();
      await runner.startTransaction();
      await runner.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        CMS_SCHEMA_SYNC_LOCK_KEY,
      ]);
      // Sequential on purpose: disabling must see the rows the insert just made.
      const inserted = await runner.query(INSERT_MISSING, [payload], true);
      const activated = await runner.query(ACTIVATE_CURRENT, [payload], true);
      const disabled = await runner.query(DISABLE_OTHERS, [payload], true);

      await runner.commitTransaction();

      return {
        ok: true,
        result: {
          activated: toLabels(activated.records),
          disabled: toLabels(disabled.records),
          inserted: toLabels(inserted.records),
          total: entries.length,
        },
      };
    } catch (error) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction().catch(() => undefined);
      }

      return {
        error: error instanceof Error ? error.message : String(error),
        ok: false,
      };
    } finally {
      await runner.release();
    }
  }
}

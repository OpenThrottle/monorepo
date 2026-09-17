import type pg from 'pg';

import type { CapabilityProbe } from './capability-probe.ts';
import type { SkippedMetric } from './metric-registry.ts';

/**
 * @description `schema_migrations` (see `scripts/openthrottle-database-migrations.ts`)
 * has no numeric id column — `filename` (e.g. `125_...sql`) is the ledger's
 * primary key and, thanks to the zero-padded numeric prefix convention, sorts
 * lexically in applied order. `max(filename)` is therefore the migration
 * high-water mark.
 */

const LEDGER_TABLE = 'schema_migrations';
const LEDGER_ID_COLUMN = 'filename';

export interface MigrationHighWaterMarkResult {
  readonly migrationHighWaterMark: string | null;
  readonly skipped: readonly SkippedMetric[];
}

/** Reads the migration high-water mark, or records why it could not be read. */
export async function readMigrationHighWaterMark(
  client: pg.Pool,
  probe: CapabilityProbe,
): Promise<MigrationHighWaterMarkResult> {
  if (!probe.hasColumns(LEDGER_TABLE, [LEDGER_ID_COLUMN])) {
    return {
      migrationHighWaterMark: null,
      skipped: [
        {
          name: 'migrationHighWaterMark',
          reason: `missing table/column: ${LEDGER_TABLE}(${LEDGER_ID_COLUMN})`,
        },
      ],
    };
  }

  const { rows } = await client.query<{ max: string | null }>(
    `SELECT max(${LEDGER_ID_COLUMN}) FROM ${LEDGER_TABLE}`,
  );

  return { migrationHighWaterMark: rows[0]?.max ?? null, skipped: [] };
}

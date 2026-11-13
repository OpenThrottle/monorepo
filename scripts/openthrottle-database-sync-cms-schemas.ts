#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getPostgresUrl,
  sanitizePostgresUrlForLogs,
} from '@openthrottle/openthrottle-agentic-utils';
import type { QueryResultRow } from 'pg';
import { Client } from 'pg';

import {
  findDatabase,
  resolveDatabaseUrl,
} from '../databases/database-registry.ts';
import type { JsonObject, JsonValue } from './generate-cms-schemas.ts';
import { CMS_SCHEMAS_DIR, CMS_SCHEMAS_MANIFEST, schemaVersion } from './generate-cms-schemas.ts'; // prettier-ignore
import { createLogger } from './utils/index.ts';

const logger = createLogger();

/**
 * @description Syncs the GENERATED block schemas (`packages/<pkg>/schemas/manifest.json`, written by
 * `cms-schemas:write`) into the `cms` database's `schemas` table, so every generated block —
 * LayoutGrid, LayoutColumn, Card, Hero, … — has a row a fragment can be created on.
 *
 * For each manifest entry, in one transaction:
 *   - inserts `(typename, version)` as ACTIVE when no live row has that pair (version is the
 *     schema's content hash, so an unchanged schema is never re-inserted);
 *   - re-activates that row when it exists but is not ACTIVE;
 *   - disables every OTHER live ACTIVE version of the same typename, so the manifest's version is
 *     the one ACTIVE schema per typename (fragments pinned to an older version keep it).
 *
 * Idempotent: a re-run with unchanged manifests matches no row and changes nothing — not even
 * `updated_at`. Unlike the dev-only sample seed this is real content, so it has no local-host
 * guard; `database:seed:cms` runs it first and `database:sync:cms-schemas` runs it alone.
 */

/** One generated schema, read from disk and ready to upsert. */
export interface CmsSchemaSyncEntry {
  readonly jsonSchema: JsonObject;
  readonly source: string;
  readonly typename: string;
  readonly version: string;
}

/** What one sync changed: `typename@version` labels per kind of write. */
export interface CmsSchemaSyncResult {
  readonly activated: readonly string[];
  readonly disabled: readonly string[];
  readonly inserted: readonly string[];
}

/** Thrown when a manifest is malformed or out of date with its schema files. */
export class CmsSchemaSyncError extends Error {}

const isJsonObject = (value: unknown): value is JsonObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const readJsonObject = (path: string): JsonObject => {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'));

  if (!isJsonObject(parsed)) {
    throw new CmsSchemaSyncError(`${path}: expected a JSON object`);
  }

  return parsed;
};

const stringField = (entry: JsonValue, key: string, where: string): string => {
  const value = isJsonObject(entry) ? entry[key] : undefined;

  if (typeof value !== 'string' || value === '') {
    throw new CmsSchemaSyncError(`${where}: every entry needs a string "${key}"`); // prettier-ignore
  }

  return value;
};

/** Every `packages/<pkg>/schemas/manifest.json` under `root`, sorted. */
export function findCmsSchemaManifests(root: string): string[] {
  const packagesDir = join(root, 'packages');

  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) =>
      join(packagesDir, dirent.name, CMS_SCHEMAS_DIR, CMS_SCHEMAS_MANIFEST),
    ) // prettier-ignore
    .filter((path) => existsSync(path))
    .sort();
}

/**
 * Reads one manifest and its schema files. Refuses a stale manifest — a schema whose content no
 * longer hashes to its manifest version — since syncing it would pin fragments to a lie.
 */
export function readCmsSchemaManifest(
  manifestPath: string,
): CmsSchemaSyncEntry[] {
  const schemasDir = join(manifestPath, '..');
  const entries = readJsonObject(manifestPath)['schemas'];

  if (!Array.isArray(entries)) {
    throw new CmsSchemaSyncError(`${manifestPath}: expected a "schemas" array`);
  }

  return entries.map((entry: JsonValue) => {
    const file = stringField(entry, 'file', manifestPath);
    const typename = stringField(entry, 'typename', manifestPath);
    const version = stringField(entry, 'version', manifestPath);
    const source = join(schemasDir, file);
    const { $comment: _banner, ...jsonSchema } = readJsonObject(source);
    const actual = schemaVersion(jsonSchema);

    if (actual !== version) {
      throw new CmsSchemaSyncError(`${source}: hashes to ${actual} but the manifest says ${version}. Run: pnpm nx run-many -t cms-schemas:write`); // prettier-ignore
    }

    return { jsonSchema, source, typename, version };
  });
}

/** Every generated schema under `root`. A typename claimed by two packages is an error. */
export function readCmsSchemaEntries(root: string): CmsSchemaSyncEntry[] {
  const entries = findCmsSchemaManifests(root).flatMap(readCmsSchemaManifest);
  const owners = new Map<string, string>();

  for (const entry of entries) {
    const owner = owners.get(entry.typename);

    if (owner !== undefined) {
      throw new CmsSchemaSyncError(`typename "${entry.typename}" is generated twice: ${owner} and ${entry.source}`); // prettier-ignore
    }

    owners.set(entry.typename, entry.source);
  }

  return entries;
}

const ENTRIES_CTE = `
  WITH entries AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS e(json_schema jsonb, typename text, version text)
  )`;

const INSERT_MISSING = `${ENTRIES_CTE}
  INSERT INTO schemas (json_schema, status, typename, version)
  SELECT e.json_schema, 'ACTIVE', e.typename, e.version FROM entries e
  WHERE NOT EXISTS (
    SELECT 1 FROM schemas s
    WHERE s.typename = e.typename AND s.version = e.version AND s.is_deleted IS NOT TRUE
  )
  RETURNING typename, version`;

const ACTIVATE_CURRENT = `${ENTRIES_CTE}
  UPDATE schemas s SET status = 'ACTIVE' FROM entries e
  WHERE s.typename = e.typename AND s.version = e.version AND s.is_deleted IS NOT TRUE
    AND s.status IS DISTINCT FROM 'ACTIVE'
  RETURNING s.typename, s.version`;

const DISABLE_OTHERS = `${ENTRIES_CTE}
  UPDATE schemas s SET status = 'DISABLED' FROM entries e
  WHERE s.typename = e.typename AND s.version <> e.version AND s.is_deleted IS NOT TRUE
    AND s.status = 'ACTIVE'
  RETURNING s.typename, s.version`;

/** Serializes concurrent syncs (two worktrees seeding one shared database). */
const SYNC_LOCK_KEY = 'openthrottle-cms-schema-sync';

/** The slice of a `pg` client the sync uses, so tests can pass a recorder. */
export interface CmsSchemaSyncClient {
  query<TRow extends QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ readonly rows: TRow[] }>;
}

interface SchemaRow {
  readonly typename: string;
  readonly version: string;
}

const labels = (rows: readonly SchemaRow[]): string[] => {
  return rows.map((row) => `${row.typename}@${row.version}`).sort();
};

/** Applies `entries` to the `schemas` table in one transaction. */
export async function syncCmsSchemas(
  client: CmsSchemaSyncClient,
  entries: readonly CmsSchemaSyncEntry[],
): Promise<CmsSchemaSyncResult> {
  const payload = JSON.stringify(
    entries.map((entry) => {
      return { json_schema: entry.jsonSchema, typename: entry.typename, version: entry.version }; // prettier-ignore
    }),
  );

  await client.query('BEGIN');

  try {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [SYNC_LOCK_KEY]); // prettier-ignore
    // Sequential on purpose: disabling must see the rows the insert just made.
    const inserted = await client.query<SchemaRow>(INSERT_MISSING, [payload]);
    const activated = await client.query<SchemaRow>(ACTIVATE_CURRENT, [payload]); // prettier-ignore
    const disabled = await client.query<SchemaRow>(DISABLE_OTHERS, [payload]);

    await client.query('COMMIT');

    return {
      activated: labels(activated.rows),
      disabled: labels(disabled.rows),
      inserted: labels(inserted.rows),
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}

/** One line describing a sync, for the seed and the standalone script. */
export function describeCmsSchemaSync(
  total: number,
  result: CmsSchemaSyncResult,
): string {
  const kinds: readonly (readonly [string, readonly string[]])[] = [
    ['inserted', result.inserted],
    ['re-activated', result.activated],
    ['disabled', result.disabled],
  ];
  const changes = kinds
    .filter(([, list]) => list.length > 0)
    .map(([verb, list]) => `${verb} ${list.length} (${list.join(', ')})`);

  return changes.length === 0
    ? `CMS schemas in sync (${total} generated, nothing to change)`
    : `CMS schemas synced (${total} generated): ${changes.join('; ')}`;
}

async function main(): Promise<void> {
  const database = findDatabase('cms');

  if (database === undefined) {
    throw new CmsSchemaSyncError('database-registry: the cms database is not registered'); // prettier-ignore
  }

  const connectionString = resolveDatabaseUrl(database, getPostgresUrl(), process.env); // prettier-ignore
  const entries = readCmsSchemaEntries(process.cwd());
  const client = new Client({ connectionString });

  logger.step(`Syncing ${entries.length} generated CMS schema(s) into ${sanitizePostgresUrlForLogs(connectionString)}`); // prettier-ignore
  await client.connect();

  try {
    logger.success(describeCmsSchemaSync(entries.length, await syncCmsSchemas(client, entries))); // prettier-ignore
  } finally {
    await client.end();
  }
}

// Only run when invoked directly (not when imported by tests or the seed).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    logger.fail(`CMS schema sync failed: ${error instanceof Error ? error.message : String(error)}`); // prettier-ignore
    process.exit(1);
  }
}

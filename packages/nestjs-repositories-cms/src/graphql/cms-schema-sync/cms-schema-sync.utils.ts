import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CMS_SCHEMA_MANIFEST_FILE } from './cms-schema-sync.constants.ts';
import type {
  CmsSchemaManifestReadResult,
  CmsSchemaSyncEntry,
  CmsSchemaSyncResult,
} from './cms-schema-sync.types.ts';

type JsonRecord = Readonly<Record<string, unknown>>;

/**
 * @description Thrown inside this module only, to unwind a manifest read; callers get a result.
 */
class CmsSchemaManifestError extends Error {}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @description `value` with every object's keys sorted, recursively; `undefined` becomes null.
 * Must stay byte-for-byte the canonical form `scripts/generate-cms-schemas.ts` hashes.
 */
export function canonicalizeCmsSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeCmsSchema);
  }

  if (!isJsonRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => {
        const entry = value[key];

        return [key, entry === undefined ? null : canonicalizeCmsSchema(entry)];
      }),
  );
}

/**
 * @description The content-hash version of a block schema: the first 16 hex characters of the
 * sha256 of its key-sorted JSON, ignoring the `$comment` banner. Same as the generator's.
 * @public
 */
export function getCmsSchemaVersion(schema: JsonRecord): string {
  const { $comment: _banner, ...content } = schema;
  const canonical = JSON.stringify(canonicalizeCmsSchema(content));

  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

function readJsonRecord(path: string): JsonRecord {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'));

  if (!isJsonRecord(parsed)) {
    throw new CmsSchemaManifestError(`${path}: expected a JSON object`);
  }

  return parsed;
}

function readString(entry: unknown, key: string, where: string): string {
  const value = isJsonRecord(entry) ? entry[key] : undefined;

  if (typeof value !== 'string' || value === '') {
    throw new CmsSchemaManifestError(
      `${where}: every entry needs a string "${key}"`,
    );
  }

  return value;
}

function readManifest(manifestPath: string): CmsSchemaSyncEntry[] {
  const schemasDir = join(manifestPath, '..');
  const entries = readJsonRecord(manifestPath)['schemas'];

  if (!Array.isArray(entries)) {
    throw new CmsSchemaManifestError(
      `${manifestPath}: expected a "schemas" array`,
    );
  }

  return entries.map((entry: unknown) => {
    const file = readString(entry, 'file', manifestPath);
    const typename = readString(entry, 'typename', manifestPath);
    const version = readString(entry, 'version', manifestPath);
    const source = join(schemasDir, file);
    const { $comment: _banner, ...jsonSchema } = readJsonRecord(source);
    const actual = getCmsSchemaVersion(jsonSchema);

    if (actual !== version) {
      throw new CmsSchemaManifestError(
        `${source}: hashes to ${actual} but its manifest says ${version}; regenerate with cms-schemas:write and rebuild`,
      );
    }

    return { jsonSchema, source, typename, version };
  });
}

/**
 * @description Reads every `<dir>/<package>/manifest.json` and its schema files. Fails, rather
 * than syncing a partial set, when there is no manifest, a manifest is malformed or stale (a schema
 * that no longer hashes to its version), or two packages generate the same typename.
 * @public
 */
export function readCmsSchemaManifests(
  dir: string,
): CmsSchemaManifestReadResult {
  try {
    const packageDirs = existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
      : [];
    const manifests = packageDirs
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => join(dir, dirent.name, CMS_SCHEMA_MANIFEST_FILE))
      .filter((path) => existsSync(path))
      .sort();

    if (manifests.length === 0) {
      return {
        error: `no block schema manifests under ${dir}; build @openthrottle/nestjs-repositories-cms, which copies them there`,
        ok: false,
      };
    }

    const entries = manifests.flatMap(readManifest);
    const owners = new Map<string, string>();

    for (const entry of entries) {
      const owner = owners.get(entry.typename);

      if (owner !== undefined) {
        return {
          error: `typename "${entry.typename}" is generated twice: ${owner} and ${entry.source}`,
          ok: false,
        };
      }

      owners.set(entry.typename, entry.source);
    }

    return { entries, ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    };
  }
}

/**
 * @description One log line describing a sync.
 * @public
 */
export function describeCmsSchemaSync(result: CmsSchemaSyncResult): string {
  const kinds: readonly (readonly [string, readonly string[]])[] = [
    ['inserted', result.inserted],
    ['re-activated', result.activated],
    ['disabled', result.disabled],
  ];
  const changes = kinds
    .filter(([, labels]) => labels.length > 0)
    .map(([verb, labels]) => `${verb} ${labels.length} (${labels.join(', ')})`);

  if (changes.length === 0) {
    return `CMS schemas in sync (${result.total} generated, nothing to change)`;
  }

  return `CMS schemas synced (${result.total} generated): ${changes.join('; ')}`;
}

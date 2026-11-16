import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  describeCmsSchemaSync,
  getCmsSchemaVersion,
  readCmsSchemaManifests,
} from './cms-schema-sync.utils.ts';

const PACKAGES_DIR = fileURLToPath(new URL('../../../../', import.meta.url));
const BLOCK_PACKAGES = ['react-router-cms-core', 'react-router-cms-ui'];

const writeJson = (path: string, value: unknown): void => {
  writeFileSync(path, JSON.stringify(value));
};

/** A one-schema package folder with a correct manifest. */
const writeBlockPackage = (
  dir: string,
  name: string,
  typename: string,
): void => {
  const schema = { additionalProperties: false, properties: {}, type: 'object' }; // prettier-ignore
  const packageDir = join(dir, name);

  mkdirSync(packageDir);
  writeJson(join(packageDir, `${typename}.schema.json`), schema);
  writeJson(join(packageDir, 'manifest.json'), {
    schemas: [
      {
        file: `${typename}.schema.json`,
        typename,
        version: getCmsSchemaVersion(schema),
      },
    ],
  });
};

describe('cms-schema-sync utils', () => {
  let dir = '';

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'cms-schema-sync-'));
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
  });

  describe('readCmsSchemaManifests', () => {
    it('reads the committed manifests, every hash matching the generator', () => {
      for (const name of BLOCK_PACKAGES) {
        cpSync(join(PACKAGES_DIR, name, 'schemas'), join(dir, name), {
          recursive: true,
        });
      }

      const read = readCmsSchemaManifests(dir);

      expect(read.ok).toBe(true);
      if (read.ok) {
        const typenames = read.entries.map((entry) => entry.typename);

        expect(typenames).toContain('Button');
        expect(typenames).toContain('LayoutGrid');
        expect(read.entries.length).toBeGreaterThanOrEqual(14);
        expect(read.entries[0]?.jsonSchema).not.toHaveProperty('$comment');
      }
    });

    it('fails when the directory holds no manifest', () => {
      const read = readCmsSchemaManifests(join(dir, 'missing'));

      expect(read).toMatchObject({ ok: false });
      expect(read.ok ? '' : read.error).toMatch(/no block schema manifests/);
    });

    it('fails on a stale manifest whose schema no longer hashes to its version', () => {
      writeBlockPackage(dir, 'blocks', 'Hero');
      writeJson(join(dir, 'blocks', 'Hero.schema.json'), { type: 'object' });

      const read = readCmsSchemaManifests(dir);

      expect(read.ok ? '' : read.error).toMatch(/hashes to .* but its manifest says/); // prettier-ignore
    });

    it('fails when two packages generate the same typename', () => {
      writeBlockPackage(dir, 'one', 'Hero');
      writeBlockPackage(dir, 'two', 'Hero');

      const read = readCmsSchemaManifests(dir);

      expect(read.ok ? '' : read.error).toMatch(/"Hero" is generated twice/);
    });

    it('fails on a malformed manifest instead of throwing', () => {
      mkdirSync(join(dir, 'broken'));
      writeJson(join(dir, 'broken', 'manifest.json'), { schemas: [{ file: 'x' }] }); // prettier-ignore

      const read = readCmsSchemaManifests(dir);

      expect(read.ok ? '' : read.error).toMatch(/needs a string "typename"/);
    });
  });

  describe('getCmsSchemaVersion', () => {
    it('ignores key order and the $comment banner', () => {
      const version = getCmsSchemaVersion({ a: 1, b: { c: 2, d: 3 } });

      // Built from entries so the keys can be out of order without tripping sort-keys.
      const shuffled = Object.fromEntries([
        [
          'b',
          Object.fromEntries([
            ['d', 3],
            ['c', 2],
          ]),
        ],
        ['$comment', 'x'],
        ['a', 1],
      ]);

      expect(getCmsSchemaVersion(shuffled)).toBe(version);
      expect(version).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('describeCmsSchemaSync', () => {
    it('says nothing changed when every list is empty', () => {
      const line = describeCmsSchemaSync({ activated: [], disabled: [], inserted: [], total: 3 }); // prettier-ignore

      expect(line).toBe('CMS schemas in sync (3 generated, nothing to change)');
    });

    it('lists each kind of write', () => {
      const line = describeCmsSchemaSync({ activated: [], disabled: ['Hero@a'], inserted: ['Hero@b'], total: 1 }); // prettier-ignore

      expect(line).toBe('CMS schemas synced (1 generated): inserted 1 (Hero@b); disabled 1 (Hero@a)'); // prettier-ignore
    });
  });
});

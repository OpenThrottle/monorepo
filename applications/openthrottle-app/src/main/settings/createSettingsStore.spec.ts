import { describe, expect, it } from 'vitest';

import type { SettingsFs } from './createSettingsStore.ts';
import { createSettingsStore } from './createSettingsStore.ts';

const FILE = '/user/data/settings.json';

const buildFs = (files: Record<string, string>) => {
  const writes: string[] = [];
  const fs: SettingsFs = {
    mkdir: () => Promise.resolve(),
    readFile: (path) => {
      const contents = files[path];

      return contents === undefined
        ? Promise.reject(new Error('ENOENT'))
        : Promise.resolve(contents);
    },
    rename: (from, to) => {
      const contents = files[from];

      if (contents === undefined) {
        return Promise.reject(new Error('ENOENT'));
      }

      files[to] = contents;
      delete files[from];
      writes.push(`rename ${from} -> ${to}`);

      return Promise.resolve();
    },
    writeFile: (path, contents) => {
      files[path] = contents;
      writes.push(`write ${path}`);

      return Promise.resolve();
    },
  };

  return { files, fs, writes };
};

const build = (files: Record<string, string> = {}) => {
  const harness = buildFs(files);

  return {
    ...harness,
    store: createSettingsStore({
      filePath: FILE,
      fs: harness.fs,
      tempSuffix: '1',
    }),
  };
};

describe('createSettingsStore', () => {
  describe('read', () => {
    it('returns defaults when the file is missing', async () => {
      expect(await build().store.read()).toEqual({ serverUrl: undefined });
    });

    it('reads a valid file', async () => {
      const { store } = build({
        [FILE]: JSON.stringify({ serverUrl: 'http://a.test:1/', version: 1 }),
      });

      expect(await store.read()).toEqual({ serverUrl: 'http://a.test:1' });
    });

    it.each([
      ['corrupt JSON', '{nope'],
      ['a non-object', '[1]'],
      [
        'a wrong version',
        JSON.stringify({ serverUrl: 'http://a.test', version: 2 }),
      ],
      ['a missing URL', JSON.stringify({ version: 1 })],
      [
        'an invalid URL',
        JSON.stringify({ serverUrl: 'ftp://a.test', version: 1 }),
      ],
    ])('treats %s as defaults without throwing', async (_name, contents) => {
      const { store } = build({ [FILE]: contents });

      expect(await store.read()).toEqual({ serverUrl: undefined });
    });
  });

  describe('write', () => {
    it('writes a temp file and renames it over the target', async () => {
      const { files, store, writes } = build();

      expect(await store.write({ serverUrl: 'http://b.test/' })).toEqual({
        ok: true,
      });
      expect(writes).toEqual([
        `write ${FILE}.1.tmp`,
        `rename ${FILE}.1.tmp -> ${FILE}`,
      ]);
      expect(JSON.parse(files[FILE] ?? '')).toEqual({
        serverUrl: 'http://b.test',
        version: 1,
      });
      expect(files[`${FILE}.1.tmp`]).toBeUndefined();
    });

    it('round-trips through read', async () => {
      const { store } = build();

      await store.write({ serverUrl: 'https://ot.example.com' });

      expect(await store.read()).toEqual({
        serverUrl: 'https://ot.example.com',
      });
    });

    it('rejects an invalid URL without touching the disk', async () => {
      const { store, writes } = build();
      const result = await store.write({ serverUrl: 'nope' });

      expect(result.ok).toBe(false);
      expect(writes).toEqual([]);
    });

    it('returns a failure instead of throwing when the disk fails', async () => {
      const { fs } = buildFs({});
      const store = createSettingsStore({
        filePath: FILE,
        fs: { ...fs, writeFile: () => Promise.reject(new Error('EACCES')) },
        tempSuffix: '1',
      });

      expect(await store.write({ serverUrl: 'http://b.test' })).toEqual({
        ok: false,
        reason: 'EACCES',
      });
    });
  });
});

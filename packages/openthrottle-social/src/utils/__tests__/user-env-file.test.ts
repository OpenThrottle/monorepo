import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readEnvValues, upsertEnvValues } from '../user-env-file.ts';

describe('user-env-file', () => {
  let dir: string;
  let envPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'user-env-'));
    envPath = join(dir, '.env');
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  describe('readEnvValues', () => {
    it('reads a missing file as empty', async () => {
      expect(await readEnvValues(envPath)).toEqual({ ok: true, value: {} });
    });

    it('skips comments, strips quotes, and lets a later line win', async () => {
      await writeFile(envPath, '# note\nA="one"\nB=two\nA=three\n');

      expect(await readEnvValues(envPath)).toEqual({
        ok: true,
        value: { A: 'three', B: 'two' },
      });
    });
  });

  describe('upsertEnvValues', () => {
    it('rewrites an existing key in place and keeps every other line', async () => {
      await writeFile(envPath, '# keep me\nA=1\n\nX_REFRESH_TOKEN=old\nB=2\n');

      await upsertEnvValues(envPath, { X_REFRESH_TOKEN: 'new' });

      expect(await readFile(envPath, 'utf8')).toBe(
        '# keep me\nA=1\n\nX_REFRESH_TOKEN=new\nB=2\n',
      );
    });

    it('appends a new key under the managed marker', async () => {
      await writeFile(envPath, 'A=1\n');

      await upsertEnvValues(envPath, { X_CLIENT_ID: 'id' });

      expect(await readFile(envPath, 'utf8')).toBe(
        'A=1\n\n# managed by openthrottle-social\nX_CLIENT_ID=id\n',
      );
    });

    it('creates the file and its directory', async () => {
      const nested = join(dir, 'a', 'b', '.env');

      expect(await upsertEnvValues(nested, { K: 'v' })).toEqual({
        ok: true,
        value: undefined,
      });
      expect(await readFile(nested, 'utf8')).toBe(
        '# managed by openthrottle-social\nK=v\n',
      );
    });

    it('returns an error instead of throwing', async () => {
      await writeFile(join(dir, 'file'), '');

      const result = await upsertEnvValues(join(dir, 'file', '.env'), {
        K: 'v',
      });

      expect(result.ok).toBe(false);
    });
  });
});

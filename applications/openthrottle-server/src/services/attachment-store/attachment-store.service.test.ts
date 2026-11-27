import {
  lstat,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ATTACHMENT_MAX_BYTES } from './attachment-store.constants.ts';
import { AttachmentStoreService } from './attachment-store.service.ts';

const pngBytes = (seed: number): Buffer => {
  const bytes = Buffer.alloc(40, seed);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'latin1');
  bytes.writeUInt32BE(64, 16);
  bytes.writeUInt32BE(32, 20);
  return bytes;
};

describe('AttachmentStoreService', () => {
  let home: string;
  let service: AttachmentStoreService;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'attachment-store-'));
    vi.stubEnv('HOME', home);
    vi.stubEnv('OPENTHROTTLE_ATTACHMENTS_DIR', '');

    const moduleRef = await Test.createTestingModule({
      providers: [AttachmentStoreService],
    }).compile();
    service = moduleRef.get(AttachmentStoreService);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await rm(home, { force: true, recursive: true });
  });

  describe('rootDirectory', () => {
    it('resolves the same path from two worktrees sharing $HOME', () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/worktrees/one');
      const first = service.rootDirectory();
      vi.spyOn(process, 'cwd').mockReturnValue('/worktrees/two');
      const second = service.rootDirectory();

      expect(first).toBe(join(home, '.openthrottle', 'attachments'));
      expect(second).toBe(first);
    });
  });

  describe('store', () => {
    it('writes <sha>.<ext> with 0600 files in a 0700 directory and no temp leftovers', async () => {
      const result = await service.store(pngBytes(1));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toMatchObject({
        byteSize: 40,
        deduplicated: false,
        ext: 'png',
        height: 32,
        mimeType: 'image/png',
        width: 64,
      });

      const file = join(service.rootDirectory(), `${result.value.sha256}.png`);
      expect((await stat(file)).mode & 0o777).toBe(0o600);
      expect((await stat(service.rootDirectory())).mode & 0o777).toBe(0o700);
      expect(await readdir(service.rootDirectory())).toEqual([
        `${result.value.sha256}.png`,
      ]);
    });

    it('dedups identical bytes: no rewrite, mtime refreshed', async () => {
      const first = await service.store(pngBytes(2));
      if (!first.ok) throw new Error('first store failed');
      const file = join(service.rootDirectory(), `${first.value.sha256}.png`);
      const old = new Date('2020-01-01T00:00:00Z');
      await utimes(file, old, old);
      const inode = (await stat(file)).ino;

      const second = await service.store(pngBytes(2));

      expect(second.ok && second.value.deduplicated).toBe(true);
      expect(second.ok && second.value.sha256).toBe(first.value.sha256);
      const after = await stat(file);
      expect(after.ino).toBe(inode);
      expect(after.mtimeMs).toBeGreaterThan(old.getTime());
    });

    it('rejects oversize input before sniffing', async () => {
      const big = Buffer.alloc(ATTACHMENT_MAX_BYTES + 1);
      pngBytes(0).copy(big);

      const result = await service.store(big);

      expect(result).toMatchObject({ ok: false, reason: 'too-large' });
    });

    it('rejects text bytes regardless of a lying .png name or image MIME', async () => {
      const result = await service.store(
        Buffer.from('definitely not a png.png image/png'),
      );

      expect(result).toMatchObject({ ok: false, reason: 'unsupported-type' });
      await expect(readdir(service.rootDirectory())).rejects.toThrow();
    });

    it('returns io-error rather than throwing when the root cannot be created', async () => {
      await writeFile(join(home, '.openthrottle'), 'a file, not a directory');

      const result = await service.store(pngBytes(3));

      expect(result).toMatchObject({ ok: false, reason: 'io-error' });
    });
  });

  describe('resolve', () => {
    it('returns the absolute path of a stored file', async () => {
      const stored = await service.store(pngBytes(4));
      if (!stored.ok) throw new Error('store failed');

      const resolved = await service.resolve(stored.value.sha256, 'png');

      expect(resolved).toEqual({
        ok: true,
        value: join(service.rootDirectory(), `${stored.value.sha256}.png`),
      });
      expect(await readFile(resolved.ok ? resolved.value : '')).toEqual(
        pngBytes(4),
      );
    });

    it('accepts a root that is itself a symlink', async () => {
      const real = join(home, 'real-root');
      vi.stubEnv('OPENTHROTTLE_ATTACHMENTS_DIR', join(home, 'link-root'));
      await service.store(pngBytes(5)); // creates link-root as a directory
      await rm(join(home, 'link-root'), { force: true, recursive: true });
      await symlink(await mkdtempDir(real), join(home, 'link-root'));

      const stored = await service.store(pngBytes(5));

      expect(stored.ok).toBe(true);
      if (!stored.ok) return;
      expect((await lstat(join(home, 'link-root'))).isSymbolicLink()).toBe(
        true,
      );
      expect((await service.resolve(stored.value.sha256, 'png')).ok).toBe(true);
    });

    it('rejects traversal in sha and ext without touching disk', async () => {
      expect(await service.resolve('../../etc/passwd', 'png')).toMatchObject({
        ok: false,
        reason: 'invalid-sha',
      });
      expect(
        await service.resolve('a'.repeat(64), 'png/../../x'),
      ).toMatchObject({
        ok: false,
        reason: 'invalid-ext',
      });
      expect(await service.resolve('A'.repeat(64), 'png')).toMatchObject({
        ok: false,
        reason: 'invalid-sha',
      });
    });

    it('reports a missing file as not-found', async () => {
      expect(await service.resolve('b'.repeat(64), 'png')).toMatchObject({
        ok: false,
        reason: 'not-found',
      });
    });

    it('rejects a symlink at the file, even one pointing inside the root', async () => {
      const stored = await service.store(pngBytes(6));
      if (!stored.ok) throw new Error('store failed');
      const linkSha = 'c'.repeat(64);
      await symlink(
        join(service.rootDirectory(), `${stored.value.sha256}.png`),
        join(service.rootDirectory(), `${linkSha}.png`),
      );
      const outside = join(home, 'secret.png');
      await writeFile(outside, pngBytes(7));
      const escapeSha = 'd'.repeat(64);
      await symlink(outside, join(service.rootDirectory(), `${escapeSha}.png`));

      expect(await service.resolve(linkSha, 'png')).toMatchObject({
        ok: false,
        reason: 'not-regular-file',
      });
      expect(await service.resolve(escapeSha, 'png')).toMatchObject({
        ok: false,
        reason: 'not-regular-file',
      });
    });

    it('rejects a directory named like an attachment', async () => {
      await service.store(pngBytes(8));
      const dirSha = 'e'.repeat(64);
      await mkdtempDir(join(service.rootDirectory(), `${dirSha}.png`));

      expect(await service.resolve(dirSha, 'png')).toMatchObject({
        ok: false,
        reason: 'not-regular-file',
      });
    });
  });

  describe('touch', () => {
    it('refreshes the mtime of a stored file', async () => {
      const stored = await service.store(pngBytes(9));
      if (!stored.ok) throw new Error('store failed');
      const file = join(service.rootDirectory(), `${stored.value.sha256}.png`);
      const old = new Date('2020-01-01T00:00:00Z');
      await utimes(file, old, old);

      const touched = await service.touch(stored.value.sha256, 'png');

      expect(touched.ok).toBe(true);
      expect((await stat(file)).mtimeMs).toBeGreaterThan(old.getTime());
    });

    it('fails like resolve for a bad or missing target', async () => {
      expect(await service.touch('nope', 'png')).toMatchObject({
        ok: false,
        reason: 'invalid-sha',
      });
      expect(await service.touch('f'.repeat(64), 'png')).toMatchObject({
        ok: false,
        reason: 'not-found',
      });
    });
  });
});

/** Creates `path` (and parents) as a directory and returns it. */
const mkdtempDir = async (path: string): Promise<string> => {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(path, { recursive: true });
  return path;
};

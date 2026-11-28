/**
 * @description Behavior tests for the attachments janitor against a real temp directory and a fake
 * repository. The clock is injected through `sweep(now)`, so file ages are fixed offsets from it.
 */
import {
  mkdir,
  mkdtemp,
  readdir,
  rm,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { AgentConversationMessageAttachmentsRepository } from '@openthrottle/nestjs-repositories-server';
import { createAgentConversationMessageAttachmentsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AttachmentStoreService } from '../../services/attachment-store/attachment-store.service.ts';
import { AttachmentsJanitorProcessor } from './attachments-janitor.processor.ts';
import type { AttachmentsJanitorJob } from './attachments-janitor.types.ts';

const NOW = new Date('2026-06-15T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const sha = (char: string): string => {
  return char.repeat(64);
};

describe('AttachmentsJanitorProcessor', () => {
  let root: string;
  const attachmentsRepository =
    createAgentConversationMessageAttachmentsRepositoryMock();
  const { deleteUnlinkedOlderThan, isShaReferenced } = attachmentsRepository;

  const build = (): AttachmentsJanitorProcessor => {
    return new AttachmentsJanitorProcessor(
      createMock<AgentConversationMessageAttachmentsRepository>(
        attachmentsRepository,
      ),
      createMock<LoggerService>(),
      createMock<AttachmentStoreService>({ rootDirectory: () => root }),
    );
  };

  /** Writes a file whose mtime is `ageMs` before NOW. */
  const seed = async (name: string, ageMs: number): Promise<void> => {
    const path = join(root, name);
    await writeFile(path, 'bytes');
    const mtime = new Date(NOW.getTime() - ageMs);
    await utimes(path, mtime, mtime);
  };

  const names = async (): Promise<string[]> => {
    return (await readdir(root)).sort();
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'attachments-janitor-'));
    vi.stubEnv('OPENTHROTTLE_ATTACHMENTS_RETENTION_DAYS', '');
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'true');
    vi.stubEnv('OT_WORKTREE_DB', '');
    deleteUnlinkedOlderThan.mockReset().mockResolvedValue(0);
    isShaReferenced.mockReset().mockResolvedValue(false);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { force: true, recursive: true });
  });

  describe('unlinked rows', () => {
    it('sweeps rows older than 24 hours', async () => {
      deleteUnlinkedOlderThan.mockResolvedValue(3);

      const summary = await build().sweep(NOW);

      expect(deleteUnlinkedOlderThan).toHaveBeenCalledWith(
        new Date(NOW.getTime() - DAY_MS),
      );
      expect(summary.rowsDeleted).toBe(3);
    });
  });

  describe('attachment files', () => {
    it('deletes an old, unreferenced file', async () => {
      await seed(`${sha('a')}.png`, 31 * DAY_MS);

      const summary = await build().sweep(NOW);

      expect(await names()).toStrictEqual([]);
      expect(summary).toMatchObject({ filesDeleted: 1, filesKept: 0 });
    });

    it('leaves files alone in a worktree, but still sweeps rows', async () => {
      vi.stubEnv('OT_WORKTREE_DB', 'isolated');
      await seed(`${sha('a')}.png`, 31 * DAY_MS);

      const summary = await build().sweep(NOW);

      expect(await names()).toStrictEqual([`${sha('a')}.png`]);
      expect(isShaReferenced).not.toHaveBeenCalled();
      expect(summary).toMatchObject({ filesDeleted: 0, filesKept: 0 });
    });

    it('keeps an old file that a row still references', async () => {
      await seed(`${sha('b')}.jpg`, 90 * DAY_MS);
      isShaReferenced.mockResolvedValue(true);

      const summary = await build().sweep(NOW);

      expect(isShaReferenced).toHaveBeenCalledWith(sha('b'));
      expect(await names()).toStrictEqual([`${sha('b')}.jpg`]);
      expect(summary).toMatchObject({ filesDeleted: 0, filesKept: 1 });
    });

    it('keeps a young file without asking the database', async () => {
      await seed(`${sha('c')}.webp`, 2 * DAY_MS);

      const summary = await build().sweep(NOW);

      expect(isShaReferenced).not.toHaveBeenCalled();
      expect(await names()).toStrictEqual([`${sha('c')}.webp`]);
      expect(summary.filesKept).toBe(1);
    });

    it('keeps a file whose mtime was refreshed between the scan and the unlink', async () => {
      const name = `${sha('d')}.gif`;
      await seed(name, 40 * DAY_MS);
      isShaReferenced.mockImplementation(async () => {
        // Another server sharing the root re-uploaded the same bytes.
        await utimes(join(root, name), NOW, NOW);
        return false;
      });

      const summary = await build().sweep(NOW);

      expect(await names()).toStrictEqual([name]);
      expect(summary).toMatchObject({ filesDeleted: 0, filesKept: 1 });
    });

    it('tolerates a file that vanishes mid-run', async () => {
      const name = `${sha('e')}.png`;
      await seed(name, 40 * DAY_MS);
      isShaReferenced.mockImplementation(async () => {
        await rm(join(root, name));
        return false;
      });

      const summary = await build().sweep(NOW);

      expect(summary).toMatchObject({ filesDeleted: 0, filesKept: 0 });
    });

    it('honors OPENTHROTTLE_ATTACHMENTS_RETENTION_DAYS', async () => {
      vi.stubEnv('OPENTHROTTLE_ATTACHMENTS_RETENTION_DAYS', '7');
      await seed(`${sha('f')}.png`, 8 * DAY_MS);

      const summary = await build().sweep(NOW);

      expect(summary.filesDeleted).toBe(1);
    });

    it('falls back to 30 days for an invalid retention value', async () => {
      vi.stubEnv('OPENTHROTTLE_ATTACHMENTS_RETENTION_DAYS', '-3');
      await seed(`${sha('1')}.png`, 8 * DAY_MS);

      const summary = await build().sweep(NOW);

      expect(summary).toMatchObject({ filesDeleted: 0, filesKept: 1 });
    });

    it('works through more files than one chunk', async () => {
      await Promise.all(
        Array.from({ length: 40 }, (_, index) => {
          return seed(
            `${index.toString(16).padStart(2, '0').repeat(32)}.png`,
            60 * DAY_MS,
          );
        }),
      );

      const summary = await build().sweep(NOW);

      expect(summary.filesDeleted).toBe(40);
      expect(await names()).toStrictEqual([]);
    });
  });

  describe('temp files', () => {
    it('deletes a stale temp file', async () => {
      await seed('.tmp-old', 2 * HOUR_MS);

      const summary = await build().sweep(NOW);

      expect(await names()).toStrictEqual([]);
      expect(summary.tempFilesDeleted).toBe(1);
    });

    it('keeps a fresh temp file', async () => {
      await seed('.tmp-fresh', 10 * 60 * 1000);

      const summary = await build().sweep(NOW);

      expect(await names()).toStrictEqual(['.tmp-fresh']);
      expect(summary.tempFilesDeleted).toBe(0);
    });
  });

  describe('turn staging directories', () => {
    const seedDir = async (name: string, ageMs: number): Promise<void> => {
      const path = join(root, name);
      await mkdir(path);
      await writeFile(join(path, 'staged.png'), 'bytes');
      const mtime = new Date(NOW.getTime() - ageMs);
      await utimes(path, mtime, mtime);
    };

    it('removes a stale .turn-* directory with its contents', async () => {
      await seedDir('.turn-abc123', 25 * HOUR_MS);

      const summary = await build().sweep(NOW);

      expect(await names()).toStrictEqual([]);
      expect(summary.turnDirsDeleted).toBe(1);
    });

    it('keeps a fresh .turn-* directory', async () => {
      await seedDir('.turn-abc123', HOUR_MS);

      const summary = await build().sweep(NOW);

      expect(await names()).toStrictEqual(['.turn-abc123']);
      expect(summary.turnDirsDeleted).toBe(0);
    });

    it('never removes a .turn-* file or a symlink to a directory', async () => {
      const target = join(root, 'target-dir');
      await seedDir('target-dir', 400 * DAY_MS);
      await seed('.turn-file', 400 * DAY_MS);
      await symlink(target, join(root, '.turn-link'));

      const summary = await build().sweep(NOW);

      expect(await names()).toStrictEqual(
        ['.turn-file', '.turn-link', 'target-dir'].sort(),
      );
      expect(summary.turnDirsDeleted).toBe(0);
    });

    it('leaves .turn-* directories alone in a worktree', async () => {
      vi.stubEnv('OT_WORKTREE_DB', 'isolated');
      await seedDir('.turn-abc123', 25 * HOUR_MS);

      const summary = await build().sweep(NOW);

      expect(await names()).toStrictEqual(['.turn-abc123']);
      expect(summary.turnDirsDeleted).toBe(0);
    });
  });

  describe('everything else', () => {
    it('ignores unrelated files and directories', async () => {
      await seed('notes.txt', 400 * DAY_MS);
      await seed(`${sha('2')}.txt`, 400 * DAY_MS);
      await seed(`${sha('A')}.png`, 400 * DAY_MS);
      await mkdir(join(root, `${sha('4')}.png`));

      const summary = await build().sweep(NOW);

      expect(await names()).toStrictEqual(
        [
          `${sha('2')}.txt`,
          `${sha('A')}.png`,
          `${sha('4')}.png`,
          'notes.txt',
        ].sort(),
      );
      expect(summary).toMatchObject({ filesDeleted: 0, tempFilesDeleted: 0 });
    });

    it('is a no-op when the root does not exist', async () => {
      await rm(root, { force: true, recursive: true });

      const summary = await build().sweep(NOW);

      expect(summary).toStrictEqual({
        filesDeleted: 0,
        filesKept: 0,
        rowsDeleted: 0,
        tempFilesDeleted: 0,
        turnDirsDeleted: 0,
      });
    });
  });

  describe('process', () => {
    it('skips the tick on a non-owner server', async () => {
      vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'false');

      await build().process(createMock<AttachmentsJanitorJob>());

      expect(deleteUnlinkedOlderThan).not.toHaveBeenCalled();
    });

    it('sweeps on the owning server', async () => {
      await build().process(createMock<AttachmentsJanitorJob>());

      expect(deleteUnlinkedOlderThan).toHaveBeenCalledTimes(1);
    });
  });
});

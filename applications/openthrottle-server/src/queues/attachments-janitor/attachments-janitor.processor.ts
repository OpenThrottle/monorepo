import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { AgentConversationMessageAttachmentsRepository } from '@openthrottle/nestjs-repositories-server';
import { toErrorMessage } from '@openthrottle/nodejs-utils';

import { AttachmentStoreService } from '../../services/attachment-store/attachment-store.service.ts';
import { isFileMissingError } from '../../services/attachment-store/attachment-store.utils.ts';
import { resolveRepeatablesOwner } from '../repeatable-job/repeatable-job.utils.ts';
import {
  ATTACHMENTS_JANITOR_QUEUE_NAME,
  ATTACHMENTS_RETENTION_DAYS_ENV_VAR,
  JANITOR_CHUNK_SIZE,
  STALE_TEMP_FILE_MAX_AGE_MS,
  UNLINKED_ROW_MAX_AGE_MS,
} from './attachments-janitor.constants.ts';
import type {
  AttachmentsJanitorFileOutcome,
  AttachmentsJanitorJob,
  AttachmentsJanitorSummary,
} from './attachments-janitor.types.ts';
import {
  chunkList,
  classifyEntryName,
  isOlderThan,
  mayReapAttachmentFiles,
  parseRetentionDays,
  retentionDaysToMs,
} from './attachments-janitor.utils.ts';

const CONCURRENCY = 1;

interface AttachmentsJanitorFileResult {
  readonly kind: 'attachment' | 'temp';
  readonly outcome: AttachmentsJanitorFileOutcome;
}

const countResults = (
  results: readonly AttachmentsJanitorFileResult[],
  kind: AttachmentsJanitorFileResult['kind'],
  outcome: AttachmentsJanitorFileOutcome,
): number => {
  return results.filter((result) => {
    return result.kind === kind && result.outcome === outcome;
  }).length;
};

/**
 * @description Daily cleanup of chat attachments. Drops upload rows never attached to a sent
 * message (older than 24h), then reaps files in the attachments root: stale `.tmp-*` writes
 * (older than 1h) and `<sha256>.<ext>` files that are past `OPENTHROTTLE_ATTACHMENTS_RETENTION_DAYS`
 * (default 30) by mtime AND unreferenced by any row in this database.
 *
 * Safe against other servers sharing the root: the store refreshes a file's mtime on every
 * upload, so the janitor re-stats right before each unlink and keeps a file that was refreshed
 * since the scan. Every filesystem call tolerates ENOENT (another janitor got there first), and
 * a missing root is a no-op. Owner-only, like the other repeatables that act outside the
 * database, and only a non-worktree checkout reaps files ({@link mayReapAttachmentFiles}).
 */
@Processor(ATTACHMENTS_JANITOR_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class AttachmentsJanitorProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly attachments: AgentConversationMessageAttachmentsRepository,
    private readonly logger: LoggerService,
    private readonly store: AttachmentStoreService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Attachments janitor worker started (concurrency=${CONCURRENCY})`,
      AttachmentsJanitorProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Attachments janitor worker shutting down (signal=${signal ?? 'unknown'})`,
      AttachmentsJanitorProcessor.name,
    );
    await this.worker.close();
  }

  async process(job: AttachmentsJanitorJob): Promise<void> {
    const ownership = resolveRepeatablesOwner();
    if (!ownership.owner) {
      this.logger.info(
        `Attachments janitor tick ${job.id ?? 'n/a'} skipped: ${ownership.reason}`,
        AttachmentsJanitorProcessor.name,
      );
      return;
    }

    const summary = await this.sweep(new Date());

    this.logger.info(
      `Attachments janitor done: rowsDeleted=${summary.rowsDeleted}, filesDeleted=${summary.filesDeleted}, tempFilesDeleted=${summary.tempFilesDeleted}, filesKept=${summary.filesKept}`,
      AttachmentsJanitorProcessor.name,
    );
  }

  /**
   * @description One cleanup pass at `now`. Public so tests drive it with a fixed clock.
   */
  async sweep(now: Date): Promise<AttachmentsJanitorSummary> {
    const nowMs = now.getTime();
    const rowsDeleted = await this.attachments.deleteUnlinkedOlderThan(
      new Date(nowMs - UNLINKED_ROW_MAX_AGE_MS),
    );

    if (!mayReapAttachmentFiles(process.env.OT_WORKTREE_DB)) {
      return {
        filesDeleted: 0,
        filesKept: 0,
        rowsDeleted,
        tempFilesDeleted: 0,
      };
    }

    const root = this.store.rootDirectory();
    const names = await this.listRoot(root);
    const retentionMs = retentionDaysToMs(
      parseRetentionDays(process.env[ATTACHMENTS_RETENTION_DAYS_ENV_VAR]),
    );

    const tasks: Array<() => Promise<AttachmentsJanitorFileResult>> = [];
    for (const name of names) {
      const entry = classifyEntryName(name);
      const path = join(root, name);
      if (entry.kind === 'attachment') {
        tasks.push(async () => {
          const outcome = await this.reapAttachment(
            path,
            entry.sha256,
            nowMs,
            retentionMs,
          );
          return { kind: 'attachment', outcome };
        });
      } else if (entry.kind === 'temp') {
        tasks.push(async () => {
          const outcome = await this.reapTemp(path, nowMs);
          return { kind: 'temp', outcome };
        });
      }
    }

    const results: AttachmentsJanitorFileResult[] = [];
    for (const group of chunkList(tasks, JANITOR_CHUNK_SIZE)) {
      // eslint-disable-next-line no-await-in-loop -- deliberate: bounded concurrency, one chunk at a time
      const settled = await Promise.all(
        group.map((run) => {
          return run();
        }),
      );
      results.push(...settled);
    }

    return {
      filesDeleted: countResults(results, 'attachment', 'deleted'),
      filesKept: countResults(results, 'attachment', 'kept'),
      rowsDeleted,
      tempFilesDeleted: countResults(results, 'temp', 'deleted'),
    };
  }

  private async listRoot(root: string): Promise<string[]> {
    try {
      return await readdir(root);
    } catch (error) {
      if (isFileMissingError(error)) return [];
      throw error;
    }
  }

  /** mtime in ms, or null when the file is gone or is not a regular file. */
  private async mtimeOf(path: string): Promise<number | null> {
    try {
      const info = await stat(path);
      return info.isFile() ? info.mtimeMs : null;
    } catch (error) {
      if (isFileMissingError(error)) return null;
      throw error;
    }
  }

  private async unlinkIfPresent(path: string): Promise<boolean> {
    try {
      await unlink(path);
      return true;
    } catch (error) {
      if (isFileMissingError(error)) return false;
      throw error;
    }
  }

  private async reapTemp(
    path: string,
    nowMs: number,
  ): Promise<AttachmentsJanitorFileOutcome> {
    try {
      const mtime = await this.mtimeOf(path);
      if (mtime === null) return 'gone';
      if (!isOlderThan(mtime, nowMs, STALE_TEMP_FILE_MAX_AGE_MS)) return 'kept';
      return (await this.unlinkIfPresent(path)) ? 'deleted' : 'gone';
    } catch (error) {
      return this.keepAfterError(path, error);
    }
  }

  private async reapAttachment(
    path: string,
    sha256: string,
    nowMs: number,
    retentionMs: number,
  ): Promise<AttachmentsJanitorFileOutcome> {
    try {
      const scanned = await this.mtimeOf(path);
      if (scanned === null) return 'gone';
      if (!isOlderThan(scanned, nowMs, retentionMs)) return 'kept';
      if (await this.attachments.isShaReferenced(sha256)) return 'kept';

      // Another server sharing the root may have re-uploaded (touched) this file since the scan.
      const recheck = await this.mtimeOf(path);
      if (recheck === null) return 'gone';
      if (!isOlderThan(recheck, nowMs, retentionMs)) return 'kept';
      return (await this.unlinkIfPresent(path)) ? 'deleted' : 'gone';
    } catch (error) {
      return this.keepAfterError(path, error);
    }
  }

  private keepAfterError(
    path: string,
    error: unknown,
  ): AttachmentsJanitorFileOutcome {
    this.logger.warn(
      `Attachments janitor left ${path} alone: ${toErrorMessage(error)}`,
      AttachmentsJanitorProcessor.name,
    );
    return 'kept';
  }
}

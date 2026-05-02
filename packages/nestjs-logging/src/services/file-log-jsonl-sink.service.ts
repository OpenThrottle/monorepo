import {
  mkdir,
  open,
  rename,
  rm,
  stat,
  type FileHandle,
} from 'node:fs/promises';
import * as path from 'node:path';
import {
  Inject,
  Injectable,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  NESTJS_LOGGING_MODULE_OPTIONS,
  type JsonlRotationPolicy,
  type ResolvedNestjsLoggingModuleOptions,
} from '../config/nestjs-logging.options';
import type {
  LogJsonlSink,
  LogStreamHub,
  StructuredLogRecord,
} from '../ports/logging-ports';
import { LOG_STREAM_HUB } from '../tokens/nestjs-logging.tokens';
import { getActiveJsonlRelativePath } from './get-active-jsonl-relative-path';
import { serializeStructuredLogLine } from './jsonl-payload';

/**
 * @description Append-only JSONL sink: structured lines, periodic `fsync`, optional size/daily rotation.
 */
@Injectable()
export class FileLogJsonlSink
  implements LogJsonlSink, OnModuleInit, OnModuleDestroy
{
  private activeRelativeName: string | undefined;
  private bytesOnFile = 0;
  private fd: FileHandle | undefined;
  private flushTimer: ReturnType<typeof setInterval> | undefined;
  private tail: Promise<void> = Promise.resolve();

  constructor(
    @Inject(NESTJS_LOGGING_MODULE_OPTIONS)
    private readonly options: ResolvedNestjsLoggingModuleOptions,
    @Optional()
    @Inject(LOG_STREAM_HUB)
    private readonly streamHub?: LogStreamHub,
  ) {}

  /**
   * @description Ensures log directory exists; starts periodic flush timer.
   */
  async onModuleInit(): Promise<void> {
    await mkdir(this.options.logDirectory, { recursive: true });
    this.flushTimer = setInterval(() => {
      void this.flush().catch(() => {
        // Background flush must not surface as unhandled rejection.
      });
    }, this.options.flushIntervalMs);
  }

  /**
   * @description Stops flush timer, waits for queued writes, flushes, and closes the file handle.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer !== undefined) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    await this.tail;
    await this.flush();
    await this.closeFd();
  }

  append(record: StructuredLogRecord): void {
    if (!this.options.levels.includes(record.level)) {
      return;
    }

    this.tail = this.tail
      .then(() => this.appendInternal(record))
      .catch(() => {
        // Keep the chain alive; losing one line is preferable to stalling the app.
      });
  }

  flush(): Promise<void> {
    return this.tail.then(async () => {
      if (this.fd === undefined) {
        return;
      }

      await this.fd.sync();
    });
  }

  private async appendInternal(record: StructuredLogRecord): Promise<void> {
    await mkdir(this.options.logDirectory, { recursive: true });

    const desiredName = this.computeActiveRelativeName();

    if (this.fd !== undefined && this.activeRelativeName !== desiredName) {
      await this.closeFd();
    }

    this.activeRelativeName = desiredName;

    const rotation = this.options.rotation;
    const line = serializeStructuredLogLine(record);
    const lineBytes = Buffer.byteLength(line, 'utf8');

    if (
      rotation.type === 'size' &&
      this.shouldRotateSizeBeforeWrite(lineBytes, rotation)
    ) {
      await this.closeFd();
      await this.rotateSizeArchive(rotation);
    }

    await this.ensureOpen();

    if (this.fd === undefined) {
      return;
    }

    await this.fd.write(line, null, 'utf8');

    this.bytesOnFile += lineBytes;
    this.streamHub?.publish(record);

    if (rotation.type === 'size' && this.bytesOnFile >= rotation.maxBytes) {
      await this.closeFd();
      await this.rotateSizeArchive(rotation);
      await this.ensureOpen();
    }
  }

  private shouldRotateSizeBeforeWrite(
    nextLineBytes: number,
    rotation: Extract<JsonlRotationPolicy, { readonly type: 'size' }>,
  ): boolean {
    return (
      this.bytesOnFile > 0 &&
      this.bytesOnFile + nextLineBytes > rotation.maxBytes
    );
  }

  private async rotateSizeArchive(
    rotation: Extract<JsonlRotationPolicy, { readonly type: 'size' }>,
  ): Promise<void> {
    const dir = this.options.logDirectory;
    const activePath = path.join(dir, this.mustActiveRelativeName());
    const stem = this.archiveStem();
    const oldest = path.join(dir, `${stem}.${rotation.keepFiles}.jsonl`);

    await rm(oldest, { force: true });

    const shiftNumberedUp = async (index: number): Promise<void> => {
      if (index < 1) {
        return;
      }

      try {
        await rename(
          path.join(dir, `${stem}.${index}.jsonl`),
          path.join(dir, `${stem}.${index + 1}.jsonl`),
        );
      } catch {
        // Source may not exist on first rotations.
      }

      await shiftNumberedUp(index - 1);
    };

    await shiftNumberedUp(rotation.keepFiles - 1);
    const firstArchive = path.join(dir, `${stem}.1.jsonl`);

    try {
      await rename(activePath, firstArchive);
    } catch {
      // Active file might not exist yet.
    }

    this.bytesOnFile = 0;
  }

  private archiveStem(): string {
    const name = this.mustActiveRelativeName();

    return name.replace(/\.jsonl$/i, '') || this.options.fileBasename;
  }

  private mustActiveRelativeName(): string {
    if (this.activeRelativeName === undefined) {
      throw new Error('FileLogJsonlSink: active file name not set');
    }

    return this.activeRelativeName;
  }

  private computeActiveRelativeName(): string {
    return getActiveJsonlRelativePath(this.options);
  }

  private async ensureOpen(): Promise<void> {
    if (this.fd !== undefined) {
      return;
    }

    const relative = this.computeActiveRelativeName();

    this.activeRelativeName = relative;
    const fullPath = path.join(this.options.logDirectory, relative);

    this.fd = await open(fullPath, 'a');

    try {
      const st = await stat(fullPath);

      this.bytesOnFile = st.size;
    } catch {
      this.bytesOnFile = 0;
    }
  }

  private async closeFd(): Promise<void> {
    if (this.fd === undefined) {
      return;
    }

    const handle = this.fd;

    this.fd = undefined;
    await handle.close();
  }
}

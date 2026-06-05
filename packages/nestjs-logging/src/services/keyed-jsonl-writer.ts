import { mkdir, open, type FileHandle } from 'node:fs/promises';
import * as path from 'node:path';
import {
  appendUtf8ToFileHandle,
  flushFileHandle,
} from './jsonl-file-handle-io';
import { KeyedJsonlWriterError } from './keyed-jsonl-writer.error';
import {
  buildKeyedJsonlRelativePath,
  keyedJsonlPairHash8,
} from './keyed-jsonl-writer-path';

const compoundKey = (queueName: string, jobId: string): string =>
  `${queueName}\0${jobId}`;

const DEFAULT_MAX_OPEN_FILES = 64;

export interface KeyedJsonlWriterOptions {
  readonly lineFormat?: 'jsonl' | 'raw';
  readonly maxOpenFiles?: number;
  readonly runOutputBaseDirectory: string;
}

/**
 * @description One JSONL line for structured run output (`lineFormat: 'jsonl'`).
 * `source` is an optional originating-layer tag (e.g. `workflow-ralph`, `cursor-agent`, `spawn`)
 * for run-output attribution; omitted from the serialized line when not provided.
 */
export interface KeyedJsonlRunRecord {
  readonly data: string | Readonly<Record<string, unknown>>;
  readonly source?: string;
  readonly timestamp: string;
  readonly type: string;
}

/**
 * @description Input for `appendRunChunk` in jsonl mode; `timestamp` defaults to `new Date().toISOString()`.
 * Optional `source` tags the originating layer for attribution (see {@link KeyedJsonlRunRecord}).
 */
export interface KeyedJsonlRunChunkInput {
  readonly data: string | Readonly<Record<string, unknown>>;
  readonly source?: string;
  readonly timestamp?: string;
  readonly type: string;
}

interface OpenEntry {
  readonly absPath: string;
  readonly fd: FileHandle;
}

/**
 * @description Lazy per-(queue,job) append-only files with LRU FD cap, serialized writes per key.
 */
export class KeyedJsonlWriter {
  private readonly runOutputBaseDirectory: string;
  private readonly maxOpen: number;
  private readonly lineFormat: 'jsonl' | 'raw';
  private baseDirEnsured = false;
  private readonly tailByCompound = new Map<string, Promise<void>>();
  private readonly openByCompound = new Map<string, OpenEntry>();
  /** @description default relative path → first compound key that claimed it */
  private readonly defaultPathOwner = new Map<string, string>();
  private readonly resolvedRelPath = new Map<string, string>();

  constructor(options: KeyedJsonlWriterOptions) {
    this.runOutputBaseDirectory = options.runOutputBaseDirectory;
    this.maxOpen = options.maxOpenFiles ?? DEFAULT_MAX_OPEN_FILES;
    this.lineFormat = options.lineFormat ?? 'jsonl';
  }

  /**
   * @description Append one line (`jsonl`) or raw UTF-8 (`raw`). Queues on the per-key chain.
   */
  appendRunChunk(
    queueName: string,
    jobId: string,
    chunk: KeyedJsonlRunChunkInput | string,
  ): void {
    this.assertValidKey(queueName, jobId);
    const k = compoundKey(queueName, jobId);

    if (this.lineFormat === 'jsonl') {
      if (typeof chunk === 'string') {
        throw new KeyedJsonlWriterError(
          'INVALID_CHUNK',
          'KeyedJsonlWriter: jsonl mode expects an object chunk with timestamp, type, and data',
        );
      }

      const record: KeyedJsonlRunRecord = {
        data: chunk.data,
        ...(chunk.source === undefined ? {} : { source: chunk.source }),
        timestamp: chunk.timestamp ?? new Date().toISOString(),
        type: chunk.type,
      };

      this.chain(k, () =>
        this.appendJsonlInternal(k, queueName, jobId, record),
      );
    } else {
      if (typeof chunk !== 'string') {
        throw new KeyedJsonlWriterError(
          'INVALID_CHUNK',
          'KeyedJsonlWriter: raw mode expects a string chunk',
        );
      }

      this.chain(k, () => this.appendRawInternal(k, queueName, jobId, chunk));
    }
  }

  /**
   * @description `fsync` for the key if open; no-op otherwise.
   */
  flush(queueName: string, jobId: string): Promise<void> {
    this.assertValidKey(queueName, jobId);
    const k = compoundKey(queueName, jobId);

    return this.afterTail(k, async () => {
      const entry = this.openByCompound.get(k);

      if (entry === undefined) {
        return;
      }

      await flushFileHandle(entry.fd);
    });
  }

  /**
   * @description Flush and close the handle for the key; idempotent.
   */
  close(queueName: string, jobId: string): Promise<void> {
    this.assertValidKey(queueName, jobId);
    const k = compoundKey(queueName, jobId);

    return this.afterTail(k, () => this.closeOpenForKey(k));
  }

  /**
   * @description Flush every open handle after all queued per-key work has run.
   */
  async flushAll(): Promise<void> {
    const compounds = [...this.tailByCompound.keys()];

    await Promise.all(
      compounds.map((k) =>
        this.afterTail(k, async () => {
          const entry = this.openByCompound.get(k);

          if (entry !== undefined) {
            await flushFileHandle(entry.fd);
          }
        }),
      ),
    );
  }

  /**
   * @description Close all open handles (worker / module shutdown).
   */
  async closeAll(): Promise<void> {
    const compounds = [
      ...new Set([
        ...this.tailByCompound.keys(),
        ...this.openByCompound.keys(),
      ]),
    ];

    await Promise.all(
      compounds.map((k) => this.afterTail(k, () => this.closeOpenForKey(k))),
    );
  }

  private assertValidKey(queueName: string, jobId: string): void {
    if (queueName.trim().length === 0 || jobId.trim().length === 0) {
      throw new KeyedJsonlWriterError(
        'INVALID_KEY',
        'KeyedJsonlWriter: queueName and jobId must be non-empty after trim',
      );
    }
  }

  private chain(compound: string, fn: () => Promise<void>): void {
    const prev = this.tailByCompound.get(compound) ?? Promise.resolve();
    const next = prev.then(fn).catch((err: unknown) => {
      this.tailByCompound.set(compound, Promise.resolve());
      throw err;
    });

    this.tailByCompound.set(compound, next);
  }

  private afterTail(compound: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.tailByCompound.get(compound) ?? Promise.resolve();

    return prev.then(fn);
  }

  private resolveRelativePath(
    queueName: string,
    jobId: string,
    compound: string,
  ): string {
    const cached = this.resolvedRelPath.get(compound);

    if (cached !== undefined) {
      return cached;
    }

    const ext = this.lineFormat === 'jsonl' ? '.jsonl' : '.log';
    const defaultRel = buildKeyedJsonlRelativePath({
      extension: ext,
      jobId,
      queueName,
    });
    const owner = this.defaultPathOwner.get(defaultRel);

    if (owner !== undefined && owner !== compound) {
      const rel = buildKeyedJsonlRelativePath({
        collisionJobSuffix: keyedJsonlPairHash8(queueName, jobId),
        extension: ext,
        jobId,
        queueName,
      });

      this.resolvedRelPath.set(compound, rel);

      return rel;
    }

    this.defaultPathOwner.set(defaultRel, compound);
    this.resolvedRelPath.set(compound, defaultRel);

    return defaultRel;
  }

  private async ensureBaseDir(): Promise<void> {
    if (this.baseDirEnsured) {
      return;
    }

    await mkdir(this.runOutputBaseDirectory, { recursive: true });
    this.baseDirEnsured = true;
  }

  private lruTouch(compound: string): void {
    const entry = this.openByCompound.get(compound);

    if (entry === undefined) {
      return;
    }

    this.openByCompound.delete(compound);
    this.openByCompound.set(compound, entry);
  }

  private async evictLruIfNeeded(forCompound: string): Promise<void> {
    if (
      this.openByCompound.size < this.maxOpen ||
      this.openByCompound.has(forCompound)
    ) {
      return;
    }

    const victim = this.openByCompound.keys().next().value;

    if (victim === undefined) {
      return;
    }

    await (this.tailByCompound.get(victim) ?? Promise.resolve());
    await this.closeOpenForKey(victim);
    await this.evictLruIfNeeded(forCompound);
  }

  private async openForCompound(
    compound: string,
    queueName: string,
    jobId: string,
  ): Promise<OpenEntry> {
    const existing = this.openByCompound.get(compound);

    if (existing !== undefined) {
      return existing;
    }

    await this.ensureBaseDir();
    await this.evictLruIfNeeded(compound);
    const rel = this.resolveRelativePath(queueName, jobId, compound);
    const absPath = path.join(this.runOutputBaseDirectory, rel);
    await mkdir(path.dirname(absPath), { recursive: true });
    const fd = await open(absPath, 'a');
    const entry: OpenEntry = { absPath, fd };

    this.openByCompound.set(compound, entry);

    return entry;
  }

  private async appendJsonlInternal(
    compound: string,
    queueName: string,
    jobId: string,
    chunk: KeyedJsonlRunRecord,
  ): Promise<void> {
    const entry = await this.openForCompound(compound, queueName, jobId);
    const line: KeyedJsonlRunRecord = {
      data: chunk.data,
      ...(chunk.source === undefined ? {} : { source: chunk.source }),
      timestamp: chunk.timestamp,
      type: chunk.type,
    };
    const payload = `${JSON.stringify(line)}\n`;

    await appendUtf8ToFileHandle(entry.fd, payload);
    this.lruTouch(compound);
  }

  private async appendRawInternal(
    compound: string,
    queueName: string,
    jobId: string,
    text: string,
  ): Promise<void> {
    const entry = await this.openForCompound(compound, queueName, jobId);

    await appendUtf8ToFileHandle(entry.fd, text);
    this.lruTouch(compound);
  }

  private async closeOpenForKey(compound: string): Promise<void> {
    const entry = this.openByCompound.get(compound);

    if (entry === undefined) {
      return;
    }

    this.openByCompound.delete(compound);

    try {
      await flushFileHandle(entry.fd);
    } finally {
      await entry.fd.close();
    }
  }
}

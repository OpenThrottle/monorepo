import { mkdir, open, type FileHandle } from 'node:fs/promises';
import * as path from 'node:path';
import type { JsonlDurabilityLevel } from '../config/nestjs-logging.options';
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

/**
 * @description Strip C0/C1 control bytes except `\n` (U+000A) and `\t` (U+0009)
 * from a raw chunk. Used only when `sanitizeRaw` is enabled; removes `\r` and
 * other control bytes an attacker could use to forge or corrupt lines while
 * preserving line breaks and tabs. Built from explicit unicode escapes to keep
 * literal control bytes out of source.
 */
const CONTROL_BYTES_EXCEPT_TAB_NEWLINE = new RegExp(
  // eslint-disable-next-line no-control-regex -- matching control bytes is the intent of the sanitizer
  '[\\u0000-\\u0008\\u000B-\\u001F\\u007F-\\u009F]',
  'g',
);

const stripRawControlBytes = (text: string): string =>
  text.replace(CONTROL_BYTES_EXCEPT_TAB_NEWLINE, '');

const DEFAULT_MAX_OPEN_FILES = 64;

export interface KeyedJsonlWriterOptions {
  /**
   * @description Durability level applied on each `flush`/`close` (see {@link JsonlDurabilityLevel}).
   * Defaults to `'sync'` (full `fsync`) to preserve historical behavior; `'datasync'` or `'none'`
   * reduce per-flush I/O cost on hot files at the expense of metadata/data durability.
   */
  readonly durability?: JsonlDurabilityLevel;
  /**
   * @description Per-key file write mode.
   *
   * - `'jsonl'` (default): each chunk is serialized with `JSON.stringify` and a
   *   trailing `\n`, so control bytes and newlines in `data` are escaped — the
   *   output is always one well-formed JSON object per line. Use this for any
   *   structured or attacker-influenced content.
   * - `'raw'`: chunks are an **untrusted-passthrough** — the caller string is
   *   appended verbatim with no newline normalization or escaping. Run output is
   *   attacker-influenced, so an embedded `\n{"forged":"line"}` can forge
   *   JSONL-looking lines in the `.log` file or split a record across reads and
   *   confuse downstream tail/line parsers. Treat raw `.log` files as opaque
   *   byte streams, never parse them as JSONL, and prefer `'jsonl'` whenever the
   *   content is consumed structurally. Set {@link sanitizeRaw} to strip control
   *   bytes if you must keep raw mode but want line-injection hardening.
   */
  readonly lineFormat?: 'jsonl' | 'raw';
  readonly maxOpenFiles?: number;
  /**
   * @description Optional observer invoked synchronously for every structured
   * record appended in `'jsonl'` mode, after the record is built (with its
   * resolved `timestamp`) and before the write is chained to disk. Intended for
   * best-effort live fan-out (e.g. a GraphQL subscription publish) without
   * coupling this dep-free writer to any transport. The callback MUST NOT throw
   * and MUST NOT block — it is wrapped in a try/catch so a faulty observer can
   * never break the durable write path, and any async work should be
   * fire-and-forget by the callback itself. Never called in `'raw'` mode (raw
   * output has no structured record). Receives a frozen record and the 0-based
   * physical `lineIndex` of the record within the `(queueName, jobId)` file —
   * the same index a reader assigns (see `readKeyedJsonlRun`), so an observer can
   * build a cursor that lines up with the historical read path. The index tracks
   * append order within this writer instance; it can drift from the on-disk line
   * for a job whose file is resumed by a second process (an unsupported topology
   * for the live tail — see the log-tail API design doc).
   */
  readonly onAppend?: (
    queueName: string,
    jobId: string,
    record: KeyedJsonlRunRecord,
    lineIndex: number,
  ) => void;
  readonly runOutputBaseDirectory: string;
  /**
   * @description Opt-in hardening for `lineFormat: 'raw'` (ignored in `'jsonl'`
   * mode). When `true`, C0/C1 control bytes other than `\n` and `\t` are stripped
   * from each raw chunk before it is written, which removes `\r` (CRLF
   * normalization) and other control bytes an attacker could use to forge or
   * corrupt lines. Embedded `\n` is preserved, so this is not a substitute for
   * `'jsonl'` mode when the content must be parsed structurally — it only reduces
   * the control-byte surface. Defaults to `false` (verbatim passthrough).
   */
  readonly sanitizeRaw?: boolean;
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
  private readonly sanitizeRaw: boolean;
  private readonly durability: JsonlDurabilityLevel;
  private readonly onAppend:
    | ((
        queueName: string,
        jobId: string,
        record: KeyedJsonlRunRecord,
        lineIndex: number,
      ) => void)
    | undefined;
  /** @description Per-key count of jsonl records appended by this instance; the
   * next value is the 0-based physical `lineIndex` handed to {@link onAppend}. */
  private readonly appendedJsonlLineCount = new Map<string, number>();
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
    this.sanitizeRaw = options.sanitizeRaw ?? false;
    this.durability = options.durability ?? 'sync';
    this.onAppend = options.onAppend;
  }

  /**
   * @description Append one line (`jsonl`) or raw UTF-8 (`raw`). Queues on the per-key chain.
   *
   * Raw mode is an untrusted-passthrough: the string is written verbatim (or with
   * control bytes stripped when `sanitizeRaw` is enabled) with no escaping, so
   * attacker-influenced content can forge or split lines in the `.log` file. Use
   * `lineFormat: 'jsonl'` for any content that is consumed structurally — see
   * {@link KeyedJsonlWriterOptions.lineFormat}.
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

      const lineIndex = this.appendedJsonlLineCount.get(k) ?? 0;
      this.appendedJsonlLineCount.set(k, lineIndex + 1);
      this.notifyOnAppend(queueName, jobId, record, lineIndex);

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
   * @description Fire the optional {@link KeyedJsonlWriterOptions.onAppend}
   * observer with a frozen copy of the just-built record. Never throws: a faulty
   * observer must not break the durable write path, so any error is swallowed.
   */
  private notifyOnAppend(
    queueName: string,
    jobId: string,
    record: KeyedJsonlRunRecord,
    lineIndex: number,
  ): void {
    if (this.onAppend === undefined) {
      return;
    }

    try {
      this.onAppend(queueName, jobId, Object.freeze({ ...record }), lineIndex);
    } catch {
      // Best-effort fan-out only; swallow to protect the durable write.
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

      await flushFileHandle(entry.fd, this.durability);
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
            await flushFileHandle(entry.fd, this.durability);
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
    const payload = this.sanitizeRaw ? stripRawControlBytes(text) : text;

    await appendUtf8ToFileHandle(entry.fd, payload);
    this.lruTouch(compound);
  }

  private async closeOpenForKey(compound: string): Promise<void> {
    const entry = this.openByCompound.get(compound);

    if (entry === undefined) {
      return;
    }

    this.openByCompound.delete(compound);

    try {
      await flushFileHandle(entry.fd, this.durability);
    } finally {
      await entry.fd.close();
    }
  }
}

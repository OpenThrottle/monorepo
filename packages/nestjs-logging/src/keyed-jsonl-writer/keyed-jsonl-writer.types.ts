import type { JsonlDurabilityLevel } from '../config/nestjs-logging.options.ts';

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

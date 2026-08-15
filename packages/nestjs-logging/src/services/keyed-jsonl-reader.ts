import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import * as path from 'node:path';
import { createInterface } from 'node:readline';
import { isRecord } from '@openthrottle/nodejs-utils';
import type { KeyedJsonlRunRecord } from './keyed-jsonl-writer';
import {
  buildKeyedJsonlRelativePath,
  keyedJsonlPairHash8,
} from './keyed-jsonl-writer-path';

/**
 * @description Streaming, cursor-based reader for the per-(queue,job) JSONL run
 * transcripts written by {@link KeyedJsonlWriter}. Resolves the same keyed file
 * path the writer uses (default, falling back to the collision-suffixed variant),
 * then reads it line-by-line so memory stays bounded by `limit` regardless of file
 * size — the counterpart needed to page/tail run output for the Phase 1 log tail
 * API (OT plan 3c397432).
 *
 * Pagination is by **physical line index** (0-based, stable because the files are
 * append-only): `afterLine` resumes after a prior page, `nextLine` is the cursor to
 * pass next. `sinceTimestamp` filters to records at/after an ISO instant. The two
 * are independent selectors; `nextLine` is always line-based so a `sinceTimestamp`
 * first page pages forward by cursor thereafter. Malformed lines are skipped but
 * still advance the line index so cursors stay aligned with physical lines.
 *
 * Level/message derivation and `levelIn` filtering are intentionally NOT done here
 * (the GraphQL layer owns that mapping); this stays a pure storage adapter.
 */

export interface ReadKeyedJsonlRunOptions {
  /**
   * @description Resume after this many physical lines from the start of the file
   * (the `nextLine` from a prior page). Defaults to 0 (start of file).
   */
  readonly afterLine?: number;
  /** @description Max records to return; the caller is responsible for capping it. */
  readonly limit: number;
  /**
   * @description Optional ISO-8601 lower bound (inclusive): only records whose
   * `timestamp >= sinceTimestamp` are returned. Applied as a filter (run files are
   * not guaranteed strictly time-sorted), so it scans from `afterLine`.
   */
  readonly sinceTimestamp?: string;
}

export interface KeyedJsonlRunLine {
  /** @description 0-based physical line index in the file (the pagination unit). */
  readonly lineNumber: number;
  readonly record: KeyedJsonlRunRecord;
}

export interface ReadKeyedJsonlRunResult {
  /** @description True when at least one further matching line exists after this page. */
  readonly hasMore: boolean;
  readonly lines: readonly KeyedJsonlRunLine[];
  /** @description Line index to resume from on the next page (the forward cursor). */
  readonly nextLine: number;
}

export interface ReadKeyedJsonlRunParams {
  readonly baseDirectory: string;
  readonly jobId: string;
  readonly options: ReadKeyedJsonlRunOptions;
  readonly queueName: string;
}

/**
 * @description Parse one JSONL line into a {@link KeyedJsonlRunRecord}, or return
 * undefined when it is blank or not a well-formed run record (defensive against
 * truncated tails / forged lines in raw-mode files).
 */
const parseRunRecord = (line: string): KeyedJsonlRunRecord | undefined => {
  const trimmed = line.trim();
  if (trimmed === '') {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return undefined;
  }

  if (
    !isRecord(parsed) ||
    typeof parsed.timestamp !== 'string' ||
    typeof parsed.type !== 'string' ||
    !('data' in parsed)
  ) {
    return undefined;
  }

  const data = parsed.data;
  if (typeof data !== 'string' && !isRecord(data)) {
    return undefined;
  }

  const source =
    typeof parsed.source === 'string' ? { source: parsed.source } : {};

  return {
    data,
    ...source,
    timestamp: parsed.timestamp,
    type: parsed.type,
  };
};

/**
 * @description Resolve the on-disk path for a (queueName, jobId) run file: the
 * writer's default keyed path, falling back to the collision-suffixed variant.
 * Returns undefined when neither exists (job never wrote output, or feature off).
 */
const resolveExistingRunFile = async (
  baseDirectory: string,
  queueName: string,
  jobId: string,
): Promise<string | undefined> => {
  const defaultRel = buildKeyedJsonlRelativePath({
    extension: '.jsonl',
    jobId,
    queueName,
  });
  const defaultAbs = path.join(baseDirectory, defaultRel);

  try {
    await access(defaultAbs);
    return defaultAbs;
  } catch {
    // fall through to the collision-suffixed candidate
  }

  const collisionRel = buildKeyedJsonlRelativePath({
    collisionJobSuffix: keyedJsonlPairHash8(queueName, jobId),
    extension: '.jsonl',
    jobId,
    queueName,
  });
  const collisionAbs = path.join(baseDirectory, collisionRel);

  try {
    await access(collisionAbs);
    return collisionAbs;
  } catch {
    return undefined;
  }
};

/**
 * @description Read a bounded window of run-output records for a (queueName,
 * jobId), starting after `afterLine` and/or at/after `sinceTimestamp`, returning
 * up to `limit` records plus the forward cursor and whether more remain. Streams
 * the file; never buffers more than the returned window. An absent file (or
 * `limit <= 0`) yields an empty page.
 */
export const readKeyedJsonlRun = async (
  params: ReadKeyedJsonlRunParams,
): Promise<ReadKeyedJsonlRunResult> => {
  const { baseDirectory, jobId, options, queueName } = params;
  const afterLine = Math.max(0, options.afterLine ?? 0);
  const limit = options.limit;
  const since = options.sinceTimestamp;

  const emptyResult: ReadKeyedJsonlRunResult = {
    hasMore: false,
    lines: [],
    nextLine: afterLine,
  };

  if (limit <= 0) {
    return emptyResult;
  }

  const absPath = await resolveExistingRunFile(baseDirectory, queueName, jobId);
  if (absPath === undefined) {
    return emptyResult;
  }

  const stream = createReadStream(absPath, { encoding: 'utf8' });
  const rl = createInterface({ crlfDelay: Infinity, input: stream });

  const lines: KeyedJsonlRunLine[] = [];
  let lineNumber = -1;
  let hasMore = false;
  let nextLine = afterLine;

  try {
    for await (const rawLine of rl) {
      lineNumber += 1;

      if (lineNumber < afterLine) {
        continue;
      }

      const record = parseRunRecord(rawLine);
      if (record === undefined) {
        continue;
      }

      if (since !== undefined && record.timestamp < since) {
        continue;
      }

      if (lines.length >= limit) {
        // One more matching line exists beyond the page — stop early.
        hasMore = true;
        break;
      }

      lines.push({ lineNumber, record });
      nextLine = lineNumber + 1;
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  return { hasMore, lines, nextLine };
};

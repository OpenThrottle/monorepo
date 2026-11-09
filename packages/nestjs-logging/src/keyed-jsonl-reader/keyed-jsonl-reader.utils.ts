import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import * as path from 'node:path';
import { createInterface } from 'node:readline';

import { isRecord } from '@openthrottle/nodejs-utils';

import type { KeyedJsonlRunRecord } from '../keyed-jsonl-writer/keyed-jsonl-writer.types.ts';
import {
  buildKeyedJsonlRelativePath,
  keyedJsonlPairHash8,
} from '../keyed-jsonl-writer-path/keyed-jsonl-writer-path.utils.ts';
import type {
  KeyedJsonlRunLine,
  ReadKeyedJsonlRunParams,
  ReadKeyedJsonlRunResult,
} from './keyed-jsonl-reader.types.ts';
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

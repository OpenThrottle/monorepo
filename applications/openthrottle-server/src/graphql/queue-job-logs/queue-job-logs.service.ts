/**
 * @description Composes the Phase 1 log tail query (OT plan 3c397432, task 3).
 * It is the GraphQL-side glue over the pure storage adapter `readKeyedJsonlRun`
 * from `@openthrottle/nestjs-logging`: it caps `limit`, validates the
 * `since`/`after` mutual exclusion, decodes the opaque `after` cursor, then for
 * each returned physical line derives the severity `level`
 * (`deriveQueueJobLogLevel`), builds the **redacted** user-facing `message`
 * (`buildRedactedQueueJobLogMessage`, task 6), and applies the optional `levelIn`
 * filter. The adapter pages by physical line index, so `nextCursor`/`hasMore`
 * reflect the physical window; `levelIn` is a post-derivation filter, so a page
 * may return fewer than `limit` events while still reporting `hasMore` — clients
 * page forward by `nextCursor` until it is null. When `BULLMQ_RUN_OUTPUT_DIR` is
 * unset the feature is disabled and an empty page is returned.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { readKeyedJsonlRun } from '@openthrottle/nestjs-logging';
import { getBullMqRunOutputBaseDirectory } from '../../config/bullmq-run-output';
import {
  decodeQueueJobLogCursor,
  encodeQueueJobLogCursor,
} from './queue-job-log-cursor';
import { mapRecordToQueueJobLogEvent } from './queue-job-log-event.mapper';
import { deriveQueueJobLogLevel } from './queue-job-log-mapping';
import type { QueueJobLogEventObject } from './queue-job-log-event.object';
import type { QueueJobLogPageObject } from './queue-job-log-page.object';
import type { QueueJobLogsInput } from './queue-job-logs.input';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

const clampLimit = (limit: number | null): number => {
  if (limit === null) {
    return DEFAULT_LIMIT;
  }

  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit)));
};

@Injectable()
export class QueueJobLogsService {
  async read(input: QueueJobLogsInput): Promise<QueueJobLogPageObject> {
    if (input.since !== null && input.after !== null) {
      throw new BadRequestException(
        'queueJobLogs: `since` and `after` are mutually exclusive',
      );
    }

    const emptyPage: QueueJobLogPageObject = {
      events: [],
      hasMore: false,
      nextCursor: null,
    };

    const baseDirectory = getBullMqRunOutputBaseDirectory();
    if (baseDirectory === undefined) {
      return emptyPage;
    }

    let afterLine: number | undefined;
    if (input.after !== null) {
      afterLine = decodeQueueJobLogCursor(input.after);
      if (afterLine === undefined) {
        throw new BadRequestException('queueJobLogs: malformed `after` cursor');
      }
    }

    const result = await readKeyedJsonlRun({
      baseDirectory,
      jobId: input.jobId,
      options: {
        afterLine,
        limit: clampLimit(input.limit),
        sinceTimestamp: input.since?.toISOString(),
      },
      queueName: input.queueName,
    });

    const levelFilter =
      input.levelIn !== null && input.levelIn.length > 0
        ? new Set(input.levelIn)
        : undefined;

    const events: QueueJobLogEventObject[] = [];
    for (const { lineNumber, record } of result.lines) {
      if (
        levelFilter !== undefined &&
        !levelFilter.has(deriveQueueJobLogLevel(record))
      ) {
        continue;
      }

      events.push(
        mapRecordToQueueJobLogEvent({
          cursor: encodeQueueJobLogCursor(lineNumber + 1),
          jobId: input.jobId,
          queueName: input.queueName,
          record,
        }),
      );
    }

    return {
      events,
      hasMore: result.hasMore,
      nextCursor: result.hasMore
        ? encodeQueueJobLogCursor(result.nextLine)
        : null,
    };
  }
}

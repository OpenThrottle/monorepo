/**
 * @description Shared pure builder that turns one keyed run-output record into the
 * Phase 1 log tail event fields (OT plan 3c397432). Both surfaces use it so they
 * emit identical, identically-redacted events: the historical `queueJobLogs` query
 * (`QueueJobLogsService`) and the live-tail `queueJobLogTail` subscription
 * publisher (the `KeyedJsonlWriter.onAppend` hook wired in the run-output module).
 *
 * Kept in its own module — not in `queue-job-log-mapping` — because it composes
 * both `queue-job-log-mapping` (level derivation) and `queue-job-log-redaction`
 * (redacted message), and `queue-job-log-redaction` imports from
 * `queue-job-log-mapping`; putting the composer here avoids an import cycle.
 */

import { deriveQueueJobLogLevel } from './queue-job-log-mapping';
import { buildRedactedQueueJobLogMessage } from './queue-job-log-redaction';
import type { QueueJobLogEventObject } from './queue-job-log-event.object';

/**
 * @description Minimal record shape the mapper reads — structurally satisfied by
 * both `KeyedJsonlRunLine.record` (query read path) and `KeyedJsonlRunRecord`
 * (the `onAppend` live path) from `@openthrottle/nestjs-logging`.
 */
export interface QueueJobLogRecordForEvent {
  readonly data: string | Readonly<Record<string, unknown>>;
  readonly source?: string;
  readonly timestamp: string;
  readonly type: string;
}

/**
 * @description Build a fully-populated, redacted {@link QueueJobLogEventObject}
 * from a keyed record. `cursor` is supplied pre-encoded by the caller (the query
 * encodes the physical line index it read; the publisher encodes the line index
 * the writer reports) so both surfaces produce comparable cursors clients can
 * dedupe on.
 */
export const mapRecordToQueueJobLogEvent = (params: {
  readonly cursor: string;
  readonly jobId: string;
  readonly queueName: string;
  readonly record: QueueJobLogRecordForEvent;
}): QueueJobLogEventObject => ({
  cursor: params.cursor,
  jobId: params.jobId,
  level: deriveQueueJobLogLevel(params.record),
  message: buildRedactedQueueJobLogMessage(params.record.data),
  queueName: params.queueName,
  source: params.record.source ?? params.queueName,
  timestamp: new Date(params.record.timestamp),
});

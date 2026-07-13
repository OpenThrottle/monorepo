/**
 * @description Live-tail publisher for the Phase 1 log tail API (OT plan 3c397432,
 * task 3). Builds the `KeyedJsonlWriter.onAppend` observer that maps + redacts each
 * appended keyed run-output record into a `QueueJobLogEvent` and publishes it on
 * the `bullmq:<queue>:<jobId>:logs` topic, where `queueJobLogTail` subscribers
 * receive it. Reuses the exact mapper the historical `queueJobLogs` query uses, so
 * the two surfaces never drift in shape or redaction, and encodes a cursor from the
 * writer-reported line index so clients can dedupe live events against catch-up
 * pages.
 *
 * Publish is fire-and-forget: the in-memory `PubSub` publish returns a promise we
 * intentionally do not await (the write path must not block on fan-out), and the
 * writer already wraps this observer in try/catch. Delivery is single-process only
 * — the in-memory PubSub only reaches subscribers in the same process as the
 * BullMQ processor doing the append (see the log-tail API design doc).
 */

import {
  queueJobLogTopic,
  type PubSubEngine,
} from '@openthrottle/nestjs-graphql';
import type { KeyedJsonlRunRecord } from '@openthrottle/nestjs-logging';
import { encodeQueueJobLogCursor } from './queue-job-log-cursor';
import { mapRecordToQueueJobLogEvent } from './queue-job-log-event.mapper';

/**
 * @description Build the `onAppend` observer bound to `pubSub`. Returns a plain
 * function (not a Nest provider) so the run-output writer factory can pass it
 * straight to `new KeyedJsonlWriter({ onAppend })`.
 */
export const createQueueJobLogTailPublisher = (
  pubSub: PubSubEngine,
): ((
  queueName: string,
  jobId: string,
  record: KeyedJsonlRunRecord,
  lineIndex: number,
) => void) => {
  return (
    queueName: string,
    jobId: string,
    record: KeyedJsonlRunRecord,
    lineIndex: number,
  ): void => {
    const event = mapRecordToQueueJobLogEvent({
      cursor: encodeQueueJobLogCursor(lineIndex + 1),
      jobId,
      queueName,
      record,
    });

    void pubSub.publish(queueJobLogTopic(queueName, jobId), {
      queueJobLogTail: event,
    });
  };
};

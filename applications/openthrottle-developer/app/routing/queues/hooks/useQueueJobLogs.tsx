/**
 * @description Live job-log data hook: history backfill (cursor-paged queueJobLogs
 * via a resource loader + useFetcher) merged with live deltas (queueJobLogTail
 * subscription over graphql-ws), keyed/deduped by cursor. Mirrors the
 * loader-seed + subscription-delta pattern of usePlanOutputStream. SSR-safe:
 * with no browser ws client it simply shows the backfilled history.
 */
import * as React from 'react';
import { useFetcher } from 'react-router';
import { useSubscription } from '@openthrottle/react-router-graphql';
import { QueueJobLogTailDocument } from '~/__generated__/graphql';
import type {
  QueueJobLogEventFragment,
  QueueJobLogTailSubscription,
  QueueJobLogsQuery,
} from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

export type QueueJobLogEvent = QueueJobLogEventFragment;

/** Live-stream lifecycle for the console indicator. */
export type QueueJobLogStreamStatus = 'ended' | 'error' | 'idle' | 'live';

type QueueJobLogsPage = QueueJobLogsQuery['queueJobLogs'];

export interface UseQueueJobLogsOptions {
  enabled?: boolean;
  jobId: string;
  queueName: string;
}

export interface UseQueueJobLogsResult {
  events: QueueJobLogEvent[];
  hasMore: boolean;
  isBackfilling: boolean;
  loadOlder: () => void;
  status: QueueJobLogStreamStatus;
}

const BACKFILL_LIMIT = 200;

/** Stable order: by timestamp, then cursor, so renders don't jump on arrival order. */
function compareEvents(a: QueueJobLogEvent, b: QueueJobLogEvent): number {
  const at = String(a.timestamp);
  const bt = String(b.timestamp);
  if (at !== bt) return at < bt ? -1 : 1;
  if (a.cursor !== b.cursor) return a.cursor < b.cursor ? -1 : 1;
  return 0;
}

export const useQueueJobLogs = (
  options: UseQueueJobLogsOptions,
): UseQueueJobLogsResult => {
  const { enabled = true, jobId, queueName } = options;

  // Hooks
  const fetcher = useFetcher<QueueJobLogsPage>();
  const [byCursor, setByCursor] = React.useState<
    ReadonlyMap<string, QueueJobLogEvent>
  >(() => new Map());
  const [hasMore, setHasMore] = React.useState(false);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<QueueJobLogStreamStatus>('idle');
  const loadedKeyRef = React.useRef<string | null>(null);
  const handledPageRef = React.useRef<QueueJobLogsPage | null>(null);

  // Setup
  const client = React.useMemo(() => getGraphqlWsClient(), []);
  const active = enabled && jobId !== '' && queueName !== '';

  // Handlers
  const mergeEvents = React.useCallback(
    (incoming: readonly QueueJobLogEvent[]) => {
      if (incoming.length === 0) {
        return;
      }
      setByCursor((previous) => {
        let changed = false;
        const next = new Map(previous);
        for (const event of incoming) {
          if (!next.has(event.cursor)) {
            next.set(event.cursor, event);
            changed = true;
          }
        }
        return changed ? next : previous;
      });
    },
    [],
  );

  const buildUrl = React.useCallback(
    (after: string | null): string => {
      const params = new URLSearchParams({
        jobId,
        limit: String(BACKFILL_LIMIT),
        queueName,
      });
      if (after != null && after !== '') {
        params.set('after', after);
      }
      return `/resources/queue-job-logs?${params.toString()}`;
    },
    [jobId, queueName],
  );

  const loadOlder = React.useCallback(() => {
    if (!hasMore || nextCursor == null) {
      return;
    }
    fetcher.load(buildUrl(nextCursor));
  }, [buildUrl, fetcher, hasMore, nextCursor]);

  // Live deltas from the subscription (no-op when client is null / disabled).
  useSubscription(
    client,
    QueueJobLogTailDocument,
    { jobId, queueName },
    {
      onComplete: () => setStatus('ended'),
      onData: (data: QueueJobLogTailSubscription) =>
        mergeEvents([data.queueJobLogTail]),
      onError: () => setStatus('error'),
    },
    active,
  );

  // Life Cycle
  // Backfill the first history page once per job identity; reset on change.
  React.useEffect(() => {
    if (!active) {
      return;
    }
    const key = `${queueName}::${jobId}`;
    if (loadedKeyRef.current === key) {
      return;
    }
    loadedKeyRef.current = key;

    setByCursor(new Map());
    setHasMore(false);
    setNextCursor(null);
    setStatus(client != null ? 'live' : 'idle');
    fetcher.load(buildUrl(null));
  }, [active, buildUrl, client, fetcher, jobId, queueName]);

  // Merge each fetched history page into the cursor-keyed map.
  React.useEffect(() => {
    if (fetcher.state !== 'idle' || fetcher.data == null) {
      return;
    }
    if (handledPageRef.current === fetcher.data) {
      return;
    }
    handledPageRef.current = fetcher.data;

    mergeEvents(fetcher.data.events);
    setHasMore(fetcher.data.hasMore);
    setNextCursor(fetcher.data.nextCursor ?? null);
  }, [fetcher.data, fetcher.state, mergeEvents]);

  // 🔌 Short Circuit
  const events = React.useMemo(
    () => Array.from(byCursor.values()).sort(compareEvents),
    [byCursor],
  );

  return {
    events,
    hasMore,
    isBackfilling: fetcher.state === 'loading',
    loadOlder,
    status,
  };
};

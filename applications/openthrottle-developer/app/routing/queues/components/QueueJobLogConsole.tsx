import * as React from 'react';
import {
  Button,
  Card,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import clsx from 'clsx';
import { useQueueJobLogs } from '~/routing/queues/hooks/useQueueJobLogs';
import type {
  QueueJobLogEvent,
  QueueJobLogStreamStatus,
} from '~/routing/queues/hooks/useQueueJobLogs';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

const FINISHED_STATES = new Set(['completed', 'failed']);

const STATUS_META: Record<
  QueueJobLogStreamStatus,
  { dot: string; label: string }
> = {
  ended: { dot: 'bg-muted-foreground', label: 'Stream ended' },
  error: { dot: 'bg-red-500', label: 'Stream error' },
  idle: { dot: 'bg-muted-foreground', label: 'Live updates unavailable' },
  live: { dot: 'bg-green-500', label: 'Live' },
};

export interface QueueJobLogConsoleProps {
  className?: string;
  jobId: string;
  jobState: string;
  queueName: string;
}

function formatTimestamp(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function formatLine(event: QueueJobLogEvent): string {
  const ts = formatTimestamp(event.timestamp);
  return `${ts} ${event.level.toUpperCase().padEnd(5)} ${event.source}  ${event.message}`;
}

/**
 * @description Reusable live job console: backfills history (queueJobLogs) and streams live deltas
 * (queueJobLogTail) with level filtering, message search, copy, autoscroll, and pause-on-scroll.
 * The scheduled-jobs UI can consume it as-is.
 */
export const QueueJobLogConsole = (
  props: QueueJobLogConsoleProps,
): React.ReactElement => {
  const { className, jobId, jobState, queueName } = props;

  // Hooks
  const { events, hasMore, isBackfilling, loadOlder, status } = useQueueJobLogs(
    { jobId, queueName },
  );
  const [levels, setLevels] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  const [autoScroll, setAutoScroll] = React.useState(true);
  const preRef = React.useRef<HTMLPreElement>(null);

  // Setup
  const query = search.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      events.filter((event) => {
        if (levels.length > 0 && !levels.includes(event.level)) {
          return false;
        }
        if (query !== '' && !event.message.toLowerCase().includes(query)) {
          return false;
        }
        return true;
      }),
    [events, levels, query],
  );
  const copyText = React.useMemo(
    () => filtered.map(formatLine).join('\n'),
    [filtered],
  );
  const statusMeta = STATUS_META[status];
  const isFinished = FINISHED_STATES.has(jobState);

  // Handlers
  const handleScroll = React.useCallback(() => {
    const element = preRef.current;
    if (!element) {
      return;
    }
    const atBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 24;
    setAutoScroll(atBottom);
  }, []);

  // Markup
  const emptyMessage = isBackfilling
    ? 'Loading logs…'
    : isFinished
      ? 'No logs were recorded for this job.'
      : 'Waiting for logs…';

  // Life Cycle
  React.useEffect(() => {
    if (!autoScroll) {
      return;
    }
    const element = preRef.current;
    if (!element) {
      return;
    }
    element.scrollTop = element.scrollHeight;
  }, [filtered, autoScroll]);

  // 🔌 Short Circuit

  return (
    <Card
      className={clsx('gap-3 p-4', className)}
      data-testid="QueueJobLogConsole"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-1 text-sm font-medium">Job logs</h2>
        <span
          className="text-muted-foreground flex items-center gap-1.5 text-xs"
          data-testid="queue-job-log-status"
        >
          <span className={clsx('size-2 rounded-full', statusMeta.dot)} />
          {statusMeta.label}
        </span>
        <div className="min-w-0 flex-1" />
        <ToggleGroup
          aria-label="Filter by log level"
          data-testid="queue-job-log-levels"
          onValueChange={setLevels}
          type="multiple"
          value={levels}
          variant="outline"
        >
          {LOG_LEVELS.map((level) => (
            <ToggleGroupItem key={level} value={level}>
              {level}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Input
          aria-label="Search job logs"
          className="w-[160px]"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter messages"
          type="search"
          value={search}
        />
        {copyText !== '' ? (
          <OpenThrottleClipboard
            className="h-8 text-xs"
            label="Copy"
            text={copyText}
          />
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p
          className="text-muted-foreground py-6 text-center text-sm"
          data-testid="queue-job-log-empty"
        >
          {emptyMessage}
        </p>
      ) : (
        <pre
          className="bg-muted/40 max-h-96 overflow-auto rounded-md p-3 font-mono text-xs leading-relaxed"
          data-testid="queue-job-log-output"
          onScroll={handleScroll}
          ref={preRef}
          tabIndex={0}
        >
          {filtered.map((event) => (
            <div key={event.cursor}>{formatLine(event)}</div>
          ))}
        </pre>
      )}

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {filtered.length} {filtered.length === 1 ? 'line' : 'lines'}
          {autoScroll ? '' : ' · autoscroll paused'}
        </span>
        {hasMore ? (
          <Button
            disabled={isBackfilling}
            onClick={loadOlder}
            size="xs"
            type="button"
            variant="outline"
          >
            Load older
          </Button>
        ) : null}
      </div>
    </Card>
  );
};

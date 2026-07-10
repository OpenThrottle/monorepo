import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import {
  formatWebsocketDebuggerPayload,
  formatWebsocketDebuggerReceivedAt,
  WEBSOCKET_DEBUGGER_EVENT_OPTIONS,
} from './websocket-debugger';
import type { WebsocketDebuggerLogEntry } from './websocket-debugger';

export interface WebsocketDebuggerLogRowProps {
  readonly entry: WebsocketDebuggerLogEntry;
}

const EVENT_LABEL_BY_NAME = new Map(
  WEBSOCKET_DEBUGGER_EVENT_OPTIONS.map((option) => [
    option.value,
    option.label,
  ]),
);

/** @see ./OpenThrottleWebsocketDebugger.tsx */
export const WebsocketDebuggerLogRow = (
  props: WebsocketDebuggerLogRowProps,
): React.ReactElement => {
  const { entry } = props;
  const eventLabel = EVENT_LABEL_BY_NAME.get(entry.event) ?? entry.event;

  return (
    <article
      className="bg-background space-y-2 rounded-md border p-3 text-sm"
      data-testid={`OpenThrottleWebsocketDebugger-entry-${entry.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <time
          className="text-muted-foreground font-mono text-xs"
          dateTime={entry.receivedAt}
        >
          {formatWebsocketDebuggerReceivedAt(entry.receivedAt)}
        </time>
        <Badge variant="secondary">{eventLabel}</Badge>
        <code className="text-muted-foreground text-xs">{entry.event}</code>
      </div>
      <pre className="bg-muted max-h-48 overflow-auto rounded-md border p-2 font-mono text-xs break-words whitespace-pre-wrap">
        {formatWebsocketDebuggerPayload(entry.payload)}
      </pre>
    </article>
  );
};

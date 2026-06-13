import * as React from 'react';
import type { NotificationEventName } from '@openthrottle/openthrottle-notifications';
import {
  Badge,
  Button,
  MultiSelect,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@openthrottle/react-router-shadcn';
import {
  filterWebsocketDebuggerEntries,
  formatWebsocketDebuggerPayload,
  formatWebsocketDebuggerReceivedAt,
  formatWebsocketDebuggerStatusColor,
  useWebsocketDebuggerLog,
  useWebsocketDebuggerSocketSubscription,
  WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES,
  WEBSOCKET_DEBUGGER_EVENT_OPTIONS,
} from './websocket-debugger';
import type {
  WebsocketDebuggerConnectionStatus,
  WebsocketDebuggerEventSubscriber,
  WebsocketDebuggerLogEntry,
  WebsocketDebuggerSocket,
} from './websocket-debugger';
import { InfoIcon } from 'lucide-react';

export interface OpenThrottleWebsocketDebuggerProps {
  readonly className?: string;
  readonly connectionStatus?: WebsocketDebuggerConnectionStatus;
  /**
   * @description Pre-filled log rows (e.g. tests). When omitted, entries come from the socket subscription.
   */
  readonly initialEntries?: readonly WebsocketDebuggerLogEntry[];
  readonly onSelectedEventNamesChange?: (
    names: readonly NotificationEventName[],
  ) => void;
  readonly selectedEventNames?: readonly NotificationEventName[];
  /** @description Standalone / Storybook: attach listeners on this socket. */
  readonly socket?: WebsocketDebuggerSocket | null;
  readonly subscribeToEvents?: WebsocketDebuggerEventSubscriber;
  readonly subscriptionEnabled?: boolean;
}

const EVENT_LABEL_BY_NAME = new Map(
  WEBSOCKET_DEBUGGER_EVENT_OPTIONS.map((option) => [
    option.value,
    option.label,
  ]),
);

const MULTI_SELECT_OPTIONS = WEBSOCKET_DEBUGGER_EVENT_OPTIONS.map((option) => ({
  label: option.label,
  value: option.value,
}));

export const OpenThrottleWebsocketDebugger = (
  props: OpenThrottleWebsocketDebuggerProps,
): React.ReactElement => {
  const {
    className,
    connectionStatus,
    initialEntries,
    onSelectedEventNamesChange,
    selectedEventNames: selectedEventNamesProp,
    socket,
    subscribeToEvents,
    subscriptionEnabled = true,
  } = props;

  // Hooks
  const {
    append,
    clear,
    entries,
    selectedEventNames: internalSelectedEventNames,
    setSelectedEventNames: setInternalSelectedEventNames,
  } = useWebsocketDebuggerLog({
    initialSelectedEventNames:
      selectedEventNamesProp ?? WEBSOCKET_DEBUGGER_ALL_EVENT_NAMES,
  });

  const isFilterControlled =
    selectedEventNamesProp !== undefined &&
    onSelectedEventNamesChange !== undefined;

  const selectedEventNames = isFilterControlled
    ? selectedEventNamesProp
    : internalSelectedEventNames;

  const setSelectedEventNames = isFilterControlled
    ? onSelectedEventNamesChange
    : setInternalSelectedEventNames;

  const displayEntries = React.useMemo(
    () => filterWebsocketDebuggerEntries(entries, selectedEventNames),
    [entries, selectedEventNames],
  );

  const hasSeededInitialEntriesRef = React.useRef(false);

  // Setup

  useWebsocketDebuggerSocketSubscription({
    append,
    enabled: subscriptionEnabled && initialEntries == null,
    socket,
    subscribeToEvents,
  });

  React.useEffect(() => {
    if (initialEntries == null || hasSeededInitialEntriesRef.current) {
      return;
    }

    hasSeededInitialEntriesRef.current = true;

    for (const entry of [...initialEntries].reverse()) {
      append(entry.event, entry.payload);
    }
  }, [append, initialEntries]);

  // Handlers
  const handleFilterChange = (values: string[]): void => {
    setSelectedEventNames(values as NotificationEventName[]);
  };

  const handleClear = (): void => {
    clear();
  };

  // Markup
  const statusLabel = connectionStatus ?? 'disconnected';
  const statusColorClass = formatWebsocketDebuggerStatusColor(statusLabel);

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('gap-0 py-0', className)}
      data-testid="OpenThrottleWebsocketDebugger"
    >
      <div className="flex flex-row flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm font-normal">
          Live notification events from the shared WebSocket connection.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="gap-1.5"
            data-testid="OpenThrottleWebsocketDebugger-status"
            variant="outline"
          >
            <span
              aria-hidden={true}
              className={cn('size-2 rounded-full', statusColorClass)}
            />
            {statusLabel}
          </Badge>
          <Button
            onClick={handleClear}
            size="sm"
            type="button"
            variant="outline"
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <p className="text-foreground flex items-center gap-2 text-sm font-medium">
            <span>Event filter</span>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="text-muted-foreground size-4" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Empty selection hides all events. Default shows every
                  notification type.
                </p>
              </TooltipContent>
            </Tooltip>
          </p>
          <MultiSelect
            aria-label="Filter Socket.IO events"
            onChange={handleFilterChange}
            options={MULTI_SELECT_OPTIONS}
            placeholder="Filter events…"
            value={[...selectedEventNames]}
          />
        </div>

        <div
          className="max-h-96 space-y-2 overflow-y-auto"
          data-testid="OpenThrottleWebsocketDebugger-log"
        >
          {displayEntries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No events yet. Change a plan status or wait for queue activity
              when connected.
            </p>
          ) : (
            displayEntries.map((entry) => (
              <WebsocketDebuggerLogRow entry={entry} key={entry.id} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface WebsocketDebuggerLogRowProps {
  readonly entry: WebsocketDebuggerLogEntry;
}

const WebsocketDebuggerLogRow = (
  rowProps: WebsocketDebuggerLogRowProps,
): React.ReactElement => {
  const { entry } = rowProps;
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

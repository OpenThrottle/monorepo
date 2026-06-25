import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { TerminalSquareIcon } from 'lucide-react';
import {
  clearClientLogSink,
  CLIENT_LOG_BUFFER_MAX_ENTRIES,
  CLIENT_LOG_LEVELS,
  getClientLogEntries,
  subscribeClientLogSink,
} from '~/routing/settings/client-log-sink';
import { SettingsSupportBundle } from '~/routing/settings/components/SettingsSupportBundle';
import type { ClientLogLevel } from '~/routing/settings/client-log-sink';
import {
  copyText,
  entryToJsonRecord,
  formatEntryLine,
  getEmptyServerSnapshot,
} from '~/routing/settings/utils/settings.support';
import { DEFAULT_SETTINGS_LOGS_DOC } from '~/routing/settings/config/defaults';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';

export interface SettingsLogsPanelProps {}

export const SettingsLogsPanel = (
  _props: SettingsLogsPanelProps,
): React.ReactElement => {
  // Hooks
  const logPreRef = React.useRef<HTMLPreElement>(null);
  const searchFieldId = React.useId();
  const [isClient, setIsClient] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [levelSelection, setLevelSelection] = React.useState<ClientLogLevel[]>([
    ...CLIENT_LOG_LEVELS,
  ]);

  const entries = React.useSyncExternalStore(
    subscribeClientLogSink,
    getClientLogEntries,
    getEmptyServerSnapshot,
  );

  // Setup
  const levelsDisabled = levelSelection.length === 0;
  const selectedLevelSet = React.useMemo(
    () => new Set(levelSelection),
    [levelSelection],
  );

  const filteredEntries = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!selectedLevelSet.has(entry.level)) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        entry.message.toLowerCase().includes(q) ||
        entry.level.toLowerCase().includes(q)
      );
    });
  }, [entries, searchQuery, selectedLevelSet]);

  const viewerEmptyReason =
    entries.length === 0
      ? 'empty-buffer'
      : levelsDisabled
        ? 'levels-none'
        : filteredEntries.length === 0
          ? 'no-match'
          : 'none';

  const logText = React.useMemo(
    () => filteredEntries.map(formatEntryLine).join('\n'),
    [filteredEntries],
  );

  // Handlers
  const handleCopyLines = async (): Promise<void> => {
    await copyText(logText || '(empty)');
  };

  const handleCopyLogJson = async (): Promise<void> => {
    const payload = filteredEntries.map(entryToJsonRecord);
    await copyText(JSON.stringify(payload, null, 2));
  };

  const handleCopyLogNdjson = async (): Promise<void> => {
    const lines = filteredEntries.map((e) =>
      JSON.stringify(entryToJsonRecord(e)),
    );
    await copyText(lines.join('\n') || '');
  };

  const handleClear = (): void => {
    clearClientLogSink();
  };

  // Markup
  const renderViewerBody = (): React.ReactNode => {
    if (!isClient) {
      return (
        <div
          aria-busy="true"
          className="space-y-2"
          data-testid="logs-viewer-loading"
        >
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      );
    }

    if (viewerEmptyReason === 'empty-buffer') {
      return 'No entries yet. Use the app or open the browser console to produce logs.';
    }

    if (viewerEmptyReason === 'levels-none') {
      return 'Select at least one level above to view captured lines.';
    }

    if (viewerEmptyReason === 'no-match') {
      return 'No entries match your level selection or search.';
    }

    return logText;
  };

  // Life Cycle
  React.useEffect(() => {
    const el = logPreRef.current;
    if (!el) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [filteredEntries]);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // 🔌 Short Circuit

  return (
    <>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h3"
          icon={TerminalSquareIcon}
          title="Logs"
        />
        <p className="text-muted-foreground mb-4 text-sm">
          Capture browser console output in this tab, copy lines, and export a
          sanitized support bundle (JSON) with env metadata and log lines.
          Server workflow and agent streams are described below—when an operator
          API exists, optional tailing can plug into the same bundle shape.
        </p>
        <p className="text-foreground mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
          Logs may include URLs or user-visible strings. Only copy or export
          what you intend to share; the support bundle redacts env secrets but
          not every substring inside log lines.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Client console sink</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleClear}
              size="sm"
              type="button"
              variant="outline"
            >
              Clear
            </Button>
            <Button
              disabled={!isClient || viewerEmptyReason !== 'none'}
              onClick={handleCopyLines}
              size="sm"
              type="button"
              variant="outline"
            >
              Copy lines
            </Button>
            <Button
              disabled={!isClient || viewerEmptyReason !== 'none'}
              onClick={handleCopyLogJson}
              size="sm"
              type="button"
              variant="outline"
            >
              Copy log JSON
            </Button>
            <Button
              disabled={!isClient || viewerEmptyReason !== 'none'}
              onClick={handleCopyLogNdjson}
              size="sm"
              type="button"
              variant="outline"
            >
              Copy log NDJSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" role="status">
            <span aria-live="polite" data-testid="logs-buffer-summary">
              Buffer {entries.length}/{CLIENT_LOG_BUFFER_MAX_ENTRIES}
              {filteredEntries.length !== entries.length &&
                entries.length > 0 &&
                ` · Shown ${filteredEntries.length}`}
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-foreground text-xs font-medium">Levels</span>
            <ToggleGroup
              aria-label="Filter by log level"
              className="flex flex-wrap justify-start gap-1"
              onValueChange={(next) => {
                setLevelSelection(next as ClientLogLevel[]);
              }}
              size="sm"
              type="multiple"
              value={[...levelSelection]}
              variant="outline"
            >
              {CLIENT_LOG_LEVELS.map((level) => (
                <ToggleGroupItem aria-label={level} key={level} value={level}>
                  {level}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground text-xs" htmlFor={searchFieldId}>
              Search
            </Label>
            <Input
              autoComplete="off"
              className="font-mono text-xs"
              id={searchFieldId}
              onChange={(ev) => setSearchQuery(ev.target.value)}
              placeholder="Filter messages (case-insensitive)"
              type="search"
              value={searchQuery}
            />
          </div>

          <p className="text-xs">
            <span className="text-foreground font-medium">
              log / info / warn / error / debug
            </span>{' '}
            plus uncaught <code className="text-xs">window.onerror</code> and{' '}
            <code className="text-xs">unhandledrejection</code>. Buffer keeps
            the last {CLIENT_LOG_BUFFER_MAX_ENTRIES} lines in this tab only
            (memory). Data stays on this device unless you copy or export.
          </p>
          <pre
            className="bg-muted text-foreground max-h-72 overflow-auto rounded-md border p-3 font-mono text-xs break-words whitespace-pre-wrap"
            ref={logPreRef}
          >
            {renderViewerBody()}
          </pre>
        </CardContent>
      </Card>

      <SettingsSupportBundle />

      <OpenThrottleFieldset
        id="workflow-agent-logs"
        legend="Workflow & Server Logs"
      >
        <div className="text-muted-foreground space-y-3 text-sm">
          <p>
            A tail or subscription to workflow-ralph stderr, queue worker logs,
            or plan-output streams is not wired to this UI yet. Until an
            authenticated operator API exposes those streams, use Plan detail
            for OpenThrottle output and capture CLI stderr per{' '}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={DEFAULT_SETTINGS_LOGS_DOC}
              rel="noreferrer"
              target="_blank"
            >
              tools/workflows README
            </a>
            .
          </p>
          <p className="text-xs">
            Future API contract (sketch): query or SSE scoped to the signed-in
            operator; correlation IDs linking queue jobs, plan IDs, and task
            IDs; no raw secrets in payloads.
          </p>
        </div>
      </OpenThrottleFieldset>
    </>
  );
};

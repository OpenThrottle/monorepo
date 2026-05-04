import * as React from 'react';
import { getEnvironment } from '@openthrottle/react-router-utils';
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
import { ScrollText } from 'lucide-react';
import {
  clearClientLogSink,
  CLIENT_LOG_BUFFER_MAX_ENTRIES,
  CLIENT_LOG_LEVELS,
  getClientLogEntries,
  type ClientLogEntry,
  type ClientLogLevel,
  subscribeClientLogSink,
} from '~/routing/settings/client-log-sink';
import { sanitizeEnvForDiagnostics } from '~/routing/settings/utils/sanitize-client-env';

const WORKFLOW_LOGS_DOC_HREF =
  'https://github.com/OpenThrottle/OpenThrottle/blob/main/tools/workflows/README.md';

interface SupportBundlePayload {
  readonly clientLog: readonly {
    readonly isoTime: string;
    readonly level: ClientLogEntry['level'];
    readonly message: string;
    readonly t: number;
  }[];
  readonly env: Record<string, string>;
  readonly generatedAt: string;
  readonly kind: 'openthrottle-developer-support-bundle';
  readonly note: string;
  readonly page: {
    readonly href: string;
    readonly referrer: string | null;
  };
  readonly runtime: {
    readonly language: string;
    readonly userAgent: string;
  };
  readonly version: 1;
  readonly workflowLogs: {
    readonly apiStatus: 'not_available';
    readonly hint: string;
  };
}

const getEmptyServerSnapshot = (): readonly ClientLogEntry[] => [];

/**
 * @description Builds a JSON payload safe to paste in support tickets (sanitized env).
 */
export const buildSupportBundlePayload = (): SupportBundlePayload => {
  const env = sanitizeEnvForDiagnostics(getEnvironment());
  const raw = getClientLogEntries();
  const clientLog = raw.map((entry) => ({
    isoTime: new Date(entry.t).toISOString(),
    level: entry.level,
    message: entry.message,
    t: entry.t,
  }));

  return {
    clientLog,
    env,
    generatedAt: new Date().toISOString(),
    kind: 'openthrottle-developer-support-bundle',
    note: 'Environment values are redacted for secrets. Do not paste raw .env or tokens.',
    page: {
      href: typeof window !== 'undefined' ? window.location.href : '',
      referrer:
        typeof window !== 'undefined' ? document.referrer || null : null,
    },
    runtime: {
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    },
    version: 1,
    workflowLogs: {
      apiStatus: 'not_available',
      hint: 'Server-side workflow-ralph stderr and plan output streaming are not exposed here yet. Use Plan detail for output, or capture stderr from `pnpm exec workflow-ralph --plan <uuid> --debug`. When an operator API exists, this section can tail or link those logs.',
    },
  };
};

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const downloadJson = (payload: SupportBundlePayload): void => {
  const stamp = payload.generatedAt.replace(/[:.]/g, '-').slice(0, 19);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `openthrottle-developer-support-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const formatEntryLine = (entry: ClientLogEntry): string => {
  const iso = new Date(entry.t).toISOString();
  return `${iso} [${entry.level}] ${entry.message}`;
};

const entryToJsonRecord = (
  entry: ClientLogEntry,
): {
  readonly isoTime: string;
  readonly level: ClientLogEntry['level'];
  readonly message: string;
  readonly t: number;
} => ({
  isoTime: new Date(entry.t).toISOString(),
  level: entry.level,
  message: entry.message,
  t: entry.t,
});

export function SettingsLogsPanel(): React.ReactElement {
  const logPreRef = React.useRef<HTMLPreElement>(null);
  const searchFieldId = React.useId();
  const [isClient, setIsClient] = React.useState(false);
  const [levelSelection, setLevelSelection] = React.useState<
    readonly ClientLogLevel[]
  >([...CLIENT_LOG_LEVELS]);
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const entries = React.useSyncExternalStore(
    subscribeClientLogSink,
    getClientLogEntries,
    getEmptyServerSnapshot,
  );

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

  const logText = React.useMemo(
    () => filteredEntries.map(formatEntryLine).join('\n'),
    [filteredEntries],
  );

  React.useEffect(() => {
    const el = logPreRef.current;
    if (!el) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [filteredEntries]);

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

  const handleCopyBundle = async (): Promise<void> => {
    const payload = buildSupportBundlePayload();
    await copyText(JSON.stringify(payload, null, 2));
  };

  const handleDownloadBundle = (): void => {
    downloadJson(buildSupportBundlePayload());
  };

  const handleClear = (): void => {
    clearClientLogSink();
  };

  const levelsDisabled = levelSelection.length === 0;
  const viewerEmptyReason =
    entries.length === 0
      ? 'empty-buffer'
      : levelsDisabled
        ? 'levels-none'
        : filteredEntries.length === 0
          ? 'no-match'
          : 'none';

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

  return (
    <div className="space-y-6">
      <GlobalHeading
        className="mb-2"
        heading="h3"
        icon={ScrollText}
        title="Logs"
      />
      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
        Capture browser console output in this tab, copy lines, and export a
        sanitized support bundle (JSON) with env metadata and log lines. Server
        workflow and agent streams are described below—when an operator API
        exists, optional tailing can plug into the same bundle shape.
      </p>

      <p className="max-w-3xl rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
        Logs may include URLs or user-visible strings. Only copy or export what
        you intend to share; the support bundle redacts env secrets but not
        every substring inside log lines.
      </p>

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
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" role="status">
            <span aria-live="polite" data-testid="logs-buffer-summary">
              Buffer {entries.length}/{CLIENT_LOG_BUFFER_MAX_ENTRIES}
              {filteredEntries.length !== entries.length &&
                entries.length > 0 &&
                ` · Shown ${filteredEntries.length}`}
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-foreground">Levels</span>
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
            <Label className="text-xs text-foreground" htmlFor={searchFieldId}>
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
            <span className="font-medium text-foreground">
              log / info / warn / error / debug
            </span>{' '}
            plus uncaught <code className="text-xs">window.onerror</code> and{' '}
            <code className="text-xs">unhandledrejection</code>. Buffer keeps
            the last {CLIENT_LOG_BUFFER_MAX_ENTRIES} lines in this tab only
            (memory). Data stays on this device unless you copy or export.
          </p>
          <pre
            className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-3 font-mono text-xs text-foreground"
            ref={logPreRef}
          >
            {renderViewerBody()}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Support bundle</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCopyBundle}
              size="sm"
              type="button"
              variant="outline"
            >
              Copy bundle JSON
            </Button>
            <Button
              onClick={handleDownloadBundle}
              size="sm"
              type="button"
              variant="secondary"
            >
              Download bundle JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Includes sanitized <code className="text-xs">window.env</code>, page
            URL, user agent, language, and the{' '}
            <strong className="font-medium text-foreground">full</strong> client
            log buffer (not the filtered view). Attach the file or pasted JSON
            to bug reports; omit sensitive context outside this bundle if
            needed.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Workflow &amp; agent logs (server)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            A tail or subscription to workflow-ralph stderr, queue worker logs,
            or plan-output streams is not wired to this UI yet. Until an
            authenticated operator API exposes those streams, use Plan detail
            for Cortex output and capture CLI stderr per{' '}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={WORKFLOW_LOGS_DOC_HREF}
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
        </CardContent>
      </Card>
    </div>
  );
}

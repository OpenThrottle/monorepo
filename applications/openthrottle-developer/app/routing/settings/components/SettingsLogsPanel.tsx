import * as React from 'react';
import { getEnvironment } from '@openthrottle/react-router-utils';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import {
  clearClientLogSink,
  getClientLogEntries,
  type ClientLogEntry,
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

export function SettingsLogsPanel(): React.ReactElement {
  const entries = React.useSyncExternalStore(
    subscribeClientLogSink,
    getClientLogEntries,
    getEmptyServerSnapshot,
  );

  const logText = React.useMemo(
    () => entries.map(formatEntryLine).join('\n'),
    [entries],
  );

  const handleCopyLogs = async (): Promise<void> => {
    await copyText(logText || '(empty)');
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

  return (
    <div className="space-y-6">
      <OpenThrottleEmptyState
        description="Capture browser console output for debugging and export sanitized diagnostics (JSON) with env + logs. Workflow/agent server logs will appear here when an API is available."
        title="Logs"
      />

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
              onClick={handleCopyLogs}
              size="sm"
              type="button"
              variant="outline"
            >
              Copy lines
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              log / info / warn / error / debug
            </span>{' '}
            plus uncaught <code className="text-xs">window.onerror</code> and{' '}
            <code className="text-xs">unhandledrejection</code>. Buffer keeps
            the last 1000 lines in this tab only (memory).
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-3 font-mono text-xs text-foreground">
            {logText.length > 0
              ? logText
              : 'No entries yet. Use the app or open the browser console to produce logs.'}
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
              Copy JSON
            </Button>
            <Button
              onClick={handleDownloadBundle}
              size="sm"
              type="button"
              variant="secondary"
            >
              Download JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Includes sanitized <code className="text-xs">window.env</code>, page
            URL, user agent, language, and the client log lines above. Attach
            the file or pasted JSON to bug reports; omit sensitive context
            outside this bundle if needed.
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

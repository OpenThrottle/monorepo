import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { useRevalidator } from 'react-router';
import {
  GlobalHeading,
  GLOBAL_METRICS_CHART_CONFIG,
  GLOBAL_METRICS_CHART_LINE_KEYS,
  GLOBAL_METRICS_LINE_DEFINITIONS,
  GLOBAL_METRICS_STAT_CARD_DOCS,
} from '@openthrottle/react-router-ui-global';
import type { GlobalMetricsChartLineKey } from '@openthrottle/react-router-ui-global';
import { BugIcon } from 'lucide-react';
import { SettingsPortsTroubleshootingCard } from '~/routing/settings/components/SettingsPortsTroubleshootingCard';
import type { ServerHealthObject } from '~/__generated__/graphql';
import { SettingsFeatureFlags } from '~/routing/settings/components/SettingsFeatureFlags';
import { SettingsEnvironment } from '~/routing/settings/components/SettingsEnvironment';
import { SettingsBuildTools } from '~/routing/settings/components/SettingsBuildTools';
import { SettingsStorage } from '~/routing/settings/components/SettingsStorage';
import { readStorageEntries } from '~/routing/settings/utils/settings.debug';

export type SettingsDebugGraphQLResult =
  | {
      readonly latencyMs: number;
      readonly serverHealth: ServerHealthObject;
      readonly status: 'ok';
    }
  | {
      readonly error: string;
      readonly latencyMs: number;
      readonly status: 'error';
    };

interface SettingsDebugPanelProps {
  readonly envSnapshot: Record<string, string>;
  readonly graphQL: SettingsDebugGraphQLResult;
}

export function SettingsDebugPanel({
  envSnapshot,
  graphQL,
}: SettingsDebugPanelProps): React.ReactElement {
  type TTemporary = {
    readonly key: string;
    readonly preview: string;
  };

  // Hooks
  const { revalidate, state } = useRevalidator();
  const [_localEntries, setLocalEntries] = React.useState<
    readonly TTemporary[]
  >([]);
  const [_sessionEntries, setSessionEntries] = React.useState<
    readonly TTemporary[]
  >([]);

  // Setup

  // Handlers
  const _handleRefreshStorage = (): void => {
    setLocalEntries(readStorageEntries(globalThis.localStorage));
    setSessionEntries(readStorageEntries(globalThis.sessionStorage));
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setLocalEntries(readStorageEntries(globalThis.localStorage));
    setSessionEntries(readStorageEntries(globalThis.sessionStorage));
  }, []);

  // 🔌 Short Circuit

  return (
    <div className="space-y-6">
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h3"
          icon={BugIcon}
          title="Debug"
        />
        <p className="mb-6 text-sm text-muted-foreground">
          Client-side diagnostics for this shell: public{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            window.env
          </code>{' '}
          shape, GraphQL health, and browser storage previews. Values here are
          masked where possible—never paste raw{' '}
          <code className="text-xs">.env</code> into support tickets.
        </p>
      </div>

      <SettingsFeatureFlags />
      <SettingsEnvironment envSnapshot={envSnapshot} />
      <SettingsBuildTools />
      <SettingsStorage />

      <SettingsPortsTroubleshootingCard />

      <Card id="server-metrics-definitions">
        <CardHeader>
          <CardTitle className="text-base">Server metrics strip</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            When the footer{' '}
            <strong className="text-foreground">Server metrics</strong> strip is
            visible, each poll calls the GraphQL{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              serverMetrics
            </code>{' '}
            field on{' '}
            <strong className="text-foreground">openthrottle-server</strong>.
            Values describe that API process on the machine hosting the server —
            not RAM or CPU for this browser tab. The strip is hidden on auth,
            profile, settings, prompts, and create routes.
          </p>
          <div>
            <p className="mb-2 font-medium text-foreground">Stat cards</p>
            <ul className="list-inside list-disc space-y-2">
              {GLOBAL_METRICS_STAT_CARD_DOCS.map((doc) => (
                <li key={doc.title}>
                  <span className="font-medium text-foreground">
                    {doc.title}
                  </span>
                  {' — '}
                  {doc.body}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">
              Chart legend (metrics over time)
            </p>
            <ul className="list-inside list-disc space-y-2">
              {GLOBAL_METRICS_CHART_LINE_KEYS.map(
                (key: GlobalMetricsChartLineKey) => {
                  const chartEntry = GLOBAL_METRICS_CHART_CONFIG[key];
                  const hint = GLOBAL_METRICS_LINE_DEFINITIONS[key];

                  return (
                    <li key={key}>
                      <span className="font-medium text-foreground">
                        {chartEntry.label}
                      </span>
                      {' — '}
                      {hint}
                    </li>
                  );
                },
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <SettingsGraphQLHealthCard
        graphQL={graphQL}
        onRecheck={() => {
          revalidate();
        }}
        revalidateState={state}
      />
    </div>
  );
}

interface SettingsGraphQLHealthCardProps {
  readonly graphQL: SettingsDebugGraphQLResult;
  readonly onRecheck: () => void;
  readonly revalidateState: 'idle' | 'loading';
}

function SettingsGraphQLHealthCard({
  graphQL,
  onRecheck,
  revalidateState,
}: SettingsGraphQLHealthCardProps): React.ReactElement {
  return (
    <Card id="graphql-endpoint-health">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">GraphQL endpoint health</CardTitle>
        <Button
          disabled={revalidateState === 'loading'}
          onClick={onRecheck}
          size="sm"
          type="button"
          variant="outline"
        >
          {revalidateState === 'loading' ? 'Checking…' : 'Re-check'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {graphQL.status === 'ok' ? (
          <>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">getRootHealth</span>{' '}
              succeeded in{' '}
              <code className="bg-accent-foreground px-1.5 py-0.5 rounded-lg text-xs">
                {graphQL.latencyMs} ms
              </code>
              .
            </p>
            <ul className="list-inside list-disc space-y-1 font-mono text-xs text-muted-foreground">
              <li>api: {graphQL.serverHealth.api}</li>
              <li>database: {graphQL.serverHealth.database}</li>
              <li>redis: {graphQL.serverHealth.redis}</li>
              <li>websocket: {graphQL.serverHealth.websocket}</li>
            </ul>
          </>
        ) : (
          <>
            <p className="text-destructive">
              <span className="font-medium">Request failed</span> after{' '}
              <code className="text-xs">{graphQL.latencyMs} ms</code>.
            </p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-3 text-xs">
              {graphQL.error}
            </pre>
          </>
        )}
      </CardContent>
    </Card>
  );
}

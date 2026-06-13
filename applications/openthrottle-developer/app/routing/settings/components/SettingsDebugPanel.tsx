import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { useRevalidator } from 'react-router';
import {
  GlobalHeading,
  GLOBAL_METRICS_CHART_CONFIG,
  GLOBAL_METRICS_CHART_LINE_KEYS,
  GLOBAL_METRICS_LINE_DEFINITIONS,
  GLOBAL_METRICS_STAT_CARD_DOCS,
} from '@openthrottle/react-router-ui-global';
import type { GlobalMetricsChartLineKey } from '@openthrottle/react-router-ui-global';
import { BugIcon, DatabaseIcon, BadgeInfoIcon } from 'lucide-react';
import { SettingsPortsTroubleshootingCard } from '~/routing/settings/components/SettingsPortsTroubleshootingCard';
import { SettingsWebsocketDebugger } from '~/routing/settings/components/SettingsWebsocketDebugger';
import { SettingsFeatureFlags } from '~/routing/settings/components/SettingsFeatureFlags';
import { SettingsEnvironment } from '~/routing/settings/components/SettingsEnvironment';
import { SettingsBuildTools } from '~/routing/settings/components/SettingsBuildTools';
import { SettingsStorage } from '~/routing/settings/components/SettingsStorage';
import { readStorageEntries } from '~/routing/settings/utils/settings.debug';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import type { ServerHealthObject } from '~/__generated__/graphql';

export type SettingsDebugGraphQLResult =
  | {
      latencyMs: number;
      serverHealth: ServerHealthObject;
      status: 'ok';
    }
  | {
      error: string;
      latencyMs: number;
      status: 'error';
    };

export interface SettingsDebugPanelProps {
  envSnapshot: Record<string, string>;
  graphQL: SettingsDebugGraphQLResult;
}

type StorageEntryRow = {
  key: string;
  preview: string;
};

export const SettingsDebugPanel = (
  props: SettingsDebugPanelProps,
): React.ReactElement => {
  const { envSnapshot, graphQL } = props;

  // Hooks
  const { revalidate, state } = useRevalidator();
  const [_localEntries, setLocalEntries] = React.useState<StorageEntryRow[]>(
    [],
  );
  const [_sessionEntries, setSessionEntries] = React.useState<
    StorageEntryRow[]
  >([]);

  // Setup

  // Handlers
  const _handleRefreshStorage = (): void => {
    setLocalEntries(readStorageEntries(globalThis.localStorage));
    setSessionEntries(readStorageEntries(globalThis.sessionStorage));
  };

  const handleRecheckGraphQL = (): void => {
    revalidate();
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setLocalEntries(readStorageEntries(globalThis.localStorage));
    setSessionEntries(readStorageEntries(globalThis.sessionStorage));
  }, []);

  // 🔌 Short Circuit

  return (
    <>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h3"
          icon={BugIcon}
          title="Debug"
        />
        <p className="text-muted-foreground mb-6 text-sm">
          Client-side diagnostics for this shell: public{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">
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

      <SettingsWebsocketDebugger />

      <OpenThrottleFieldset
        icon={BadgeInfoIcon}
        id="server-metrics-definitions"
        legend="Server metrics definitions"
      >
        <div className="text-muted-foreground space-y-4 text-sm">
          <p>
            When the footer{' '}
            <strong className="text-foreground">Server metrics</strong> strip is
            visible, each poll calls the GraphQL{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              serverMetrics
            </code>{' '}
            field on{' '}
            <strong className="text-foreground">openthrottle-server</strong>.
            Values describe that API process on the machine hosting the server —
            not RAM or CPU for this browser tab. The strip is hidden on auth,
            profile, settings, prompts, and create routes.
          </p>
          <div>
            <p className="text-foreground mb-2 font-medium">Stat cards</p>
            <ul className="list-inside list-disc space-y-2">
              {GLOBAL_METRICS_STAT_CARD_DOCS.map((doc) => (
                <li key={doc.title}>
                  <span className="text-foreground font-medium">
                    {doc.title}
                  </span>
                  {' — '}
                  {doc.body}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-foreground mb-2 font-medium">
              Chart legend (metrics over time)
            </p>
            <ul className="list-inside list-disc space-y-2">
              {GLOBAL_METRICS_CHART_LINE_KEYS.map(
                (key: GlobalMetricsChartLineKey) => {
                  const chartEntry = GLOBAL_METRICS_CHART_CONFIG[key];
                  const hint = GLOBAL_METRICS_LINE_DEFINITIONS[key];

                  return (
                    <li key={key}>
                      <span className="text-foreground font-medium">
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
        </div>
      </OpenThrottleFieldset>

      <SettingsGraphQLHealthCard
        graphQL={graphQL}
        onRecheck={handleRecheckGraphQL}
        revalidateState={state}
      />
    </>
  );
};

export interface SettingsGraphQLHealthCardProps {
  graphQL: SettingsDebugGraphQLResult;
  onRecheck: () => void;
  revalidateState: 'idle' | 'loading';
}

const SettingsGraphQLHealthCard = (
  props: SettingsGraphQLHealthCardProps,
): React.ReactElement => {
  const { graphQL, onRecheck, revalidateState } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      className="relative"
      icon={DatabaseIcon}
      id="graphql-endpoint-health"
      legend="GraphQL endpoint health"
    >
      {graphQL.status === 'ok' ? (
        <>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">getRootHealth</span>{' '}
              succeeded in{' '}
              <code className="bg-accent-foreground rounded-lg px-1.5 py-0.5 text-xs">
                {graphQL.latencyMs} ms
              </code>
              .
            </p>
            <button
              // className="absolute right-4 bottom-0"
              disabled={revalidateState === 'loading'}
              onClick={onRecheck}
              type="button"
            >
              <Badge color="green">
                {revalidateState === 'loading' ? 'Checking…' : 'Re-check'}
              </Badge>
            </button>
          </div>

          <ul className="text-muted-foreground list-inside list-disc space-y-1 font-mono text-xs">
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
          <pre className="bg-muted max-h-40 overflow-auto rounded-md border p-3 text-xs break-words whitespace-pre-wrap">
            {graphQL.error}
          </pre>
        </>
      )}
    </OpenThrottleFieldset>
  );
};

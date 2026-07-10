import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { DatabaseIcon } from 'lucide-react';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import type { SettingsDebugGraphQLResult } from '~/routing/settings/components/SettingsDebugPanel';

export interface SettingsGraphQLHealthCardProps {
  graphQL: SettingsDebugGraphQLResult;
  onRecheck: () => void;
  revalidateState: 'idle' | 'loading';
}

export const SettingsGraphQLHealthCard = (
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

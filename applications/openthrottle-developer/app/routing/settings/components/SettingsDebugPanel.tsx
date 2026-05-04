import * as React from 'react';
import { FEATURE_BETA_PREVIEW } from '@openthrottle/react-router-utils';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { useRevalidator } from 'react-router';
import { maskSensitiveEnvValue } from '~/routing/settings/utils/sanitize-client-env';
import type { ServerHealthObject } from '~/__generated__/graphql';

const VITE_DEVTOOLS_DOC_HREF =
  'https://github.com/OpenThrottle/OpenThrottle/blob/main/docs/monorepo/openthrottle-developer-vite-devtools.md';

const LOCAL_SERVICES_PORTS_DOC_HREF =
  'https://github.com/OpenThrottle/OpenThrottle/blob/main/docs/monorepo/local-services-and-ports.md';

const STORAGE_PREVIEW_MAX = 140;

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

const summarizeStoragePair = (key: string, raw: string): string => {
  const lower = key.toLowerCase();
  if (
    lower.includes('token') ||
    lower.includes('auth') ||
    lower.includes('secret')
  ) {
    return maskSensitiveEnvValue(key, raw);
  }
  if (raw.length > STORAGE_PREVIEW_MAX) {
    return `${raw.slice(0, STORAGE_PREVIEW_MAX)}…`;
  }
  return raw;
};

const readStorageEntries = (
  storage: Storage | undefined,
): readonly { readonly key: string; readonly preview: string }[] => {
  if (!storage || typeof storage.length !== 'number') {
    return [];
  }
  const out: { key: string; preview: string }[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    const raw = storage.getItem(key) ?? '';
    out.push({ key, preview: summarizeStoragePair(key, raw) });
  }
  out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
};

export function SettingsDebugPanel({
  envSnapshot,
  graphQL,
}: SettingsDebugPanelProps): React.ReactElement {
  const { revalidate, state } = useRevalidator();
  const [localEntries, setLocalEntries] = React.useState<
    readonly { readonly key: string; readonly preview: string }[]
  >([]);
  const [sessionEntries, setSessionEntries] = React.useState<
    readonly { readonly key: string; readonly preview: string }[]
  >([]);

  React.useEffect(() => {
    setLocalEntries(readStorageEntries(globalThis.localStorage));
    setSessionEntries(readStorageEntries(globalThis.sessionStorage));
  }, []);

  const handleCopyEnv = async (): Promise<void> => {
    const text = JSON.stringify(envSnapshot, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const handleRefreshStorage = (): void => {
    setLocalEntries(readStorageEntries(globalThis.localStorage));
    setSessionEntries(readStorageEntries(globalThis.sessionStorage));
  };

  return (
    <div className="space-y-6">
      <OpenThrottleEmptyState
        description="Diagnostics for this app: public env shape, API health, and browser storage. Secrets in env are masked; do not paste raw .env in tickets."
        title="Debug"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              FEATURE_BETA_PREVIEW
            </span>{' '}
            (dev shell):{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {FEATURE_BETA_PREVIEW ? 'true' : 'false'}
            </code>
          </p>
          <p>
            <span className="font-medium text-foreground">
              REACT_ROUTER_DEV_TOOLS
            </span>{' '}
            is read when the Vite dev server starts. Set{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              REACT_ROUTER_DEV_TOOLS=true
            </code>{' '}
            in <code className="text-xs">.env</code> and restart{' '}
            <code className="text-xs">nx run openthrottle-developer:dev</code>.
            See the monorepo doc below.
          </p>
          <p>
            <span className="font-medium text-foreground">
              APP_ENABLE_ANALYTICS
            </span>{' '}
            and{' '}
            <span className="font-medium text-foreground">
              APP_ENABLE_AUTHENTICATION
            </span>{' '}
            are not included in <code className="text-xs">window.env</code>;
            check your environment or deployment config if you need them.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Sanitized env snapshot</CardTitle>
          <Button
            onClick={handleCopyEnv}
            size="sm"
            type="button"
            variant="outline"
          >
            Copy JSON
          </Button>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted/80">
                <tr>
                  <th className="p-2 font-medium">Key</th>
                  <th className="p-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(envSnapshot).map(([key, value]) => (
                  <tr className="border-t" key={key}>
                    <td className="align-top p-2 font-mono text-muted-foreground">
                      {key}
                    </td>
                    <td className="break-all p-2 font-mono">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            React Router / Vite devtools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">When to open:</span>{' '}
            Use the bundle analyzer for chunk overlap, duplicate packages, or
            split issues. Use React Router DevTools when debugging routes,
            loaders, and actions. Enable{' '}
            <code className="text-xs">REACT_ROUTER_DEV_TOOLS</code> only for
            those sessions; leave it off for a quieter console day to day.
          </p>
          <p>
            Bundle analyzer,{' '}
            <code className="text-xs">vite-plugin-devtools-json</code>, and
            React Router DevTools hook order are documented here:
          </p>
          <p>
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={VITE_DEVTOOLS_DOC_HREF}
              rel="noreferrer"
              target="_blank"
            >
              docs/monorepo/openthrottle-developer-vite-devtools.md (GitHub)
            </a>
          </p>
          <p>
            <span className="font-medium text-foreground">Clone path:</span>{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              docs/monorepo/openthrottle-developer-vite-devtools.md
            </code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Local dev: ports, hosts &amp; API URLs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-2">
            <li>
              <span className="font-medium text-foreground">Vite port:</span>{' '}
              <code className="text-xs">PORT</code> in{' '}
              <code className="text-xs">.env</code> overrides the default (3000
              in <code className="text-xs">vite.config.ts</code>); the monorepo
              template often uses 6020—browse the same port Vite logs on
              startup.
            </li>
            <li>
              <span className="font-medium text-foreground">
                API_URL_EXTERNAL vs API_URL_INTERNAL:
              </span>{' '}
              the browser uses external; SSR/loaders use internal. Point both at
              a reachable openthrottle-server origin in local dev; mismatches
              often show up as client-only or navigation-only failures.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Docker / containers:
              </span>{' '}
              <code className="text-xs">localhost</code> inside a container is
              not the host—use{' '}
              <code className="text-xs">host.docker.internal</code> (or your
              host IP) for the API from server-side fetches.
            </li>
            <li>
              <span className="font-medium text-foreground">Hostnames:</span>{' '}
              Caddy / <code className="text-xs">developer.local</code> setups
              are covered in the ports doc; align{' '}
              <code className="text-xs">APP_URL_*</code> with the URL you
              actually open.
            </li>
          </ul>
          <p>
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={VITE_DEVTOOLS_DOC_HREF}
              rel="noreferrer"
              target="_blank"
            >
              Vite &amp; devtools (analyzers, when to enable)
            </a>
            {' · '}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={LOCAL_SERVICES_PORTS_DOC_HREF}
              rel="noreferrer"
              target="_blank"
            >
              Local services &amp; ports
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">
            localStorage & sessionStorage
          </CardTitle>
          <Button
            onClick={handleRefreshStorage}
            size="sm"
            type="button"
            variant="outline"
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="mb-2 font-medium text-foreground">localStorage</p>
            {localEntries.length === 0 ? (
              <p className="text-muted-foreground">No keys.</p>
            ) : (
              <div className="max-h-48 overflow-auto rounded-md border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="p-2 font-medium">Key</th>
                      <th className="p-2 font-medium">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localEntries.map((row) => (
                      <tr className="border-t" key={row.key}>
                        <td className="align-top p-2 font-mono text-muted-foreground">
                          {row.key}
                        </td>
                        <td className="break-all p-2 font-mono">
                          {row.preview}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">sessionStorage</p>
            {sessionEntries.length === 0 ? (
              <p className="text-muted-foreground">No keys.</p>
            ) : (
              <div className="max-h-48 overflow-auto rounded-md border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="p-2 font-medium">Key</th>
                      <th className="p-2 font-medium">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionEntries.map((row) => (
                      <tr className="border-t" key={row.key}>
                        <td className="align-top p-2 font-mono text-muted-foreground">
                          {row.key}
                        </td>
                        <td className="break-all p-2 font-mono">
                          {row.preview}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
    <Card>
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
              <code className="text-xs">{graphQL.latencyMs} ms</code>.
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

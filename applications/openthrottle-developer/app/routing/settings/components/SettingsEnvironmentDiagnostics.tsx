import * as React from 'react';
import { Link } from 'react-router';
import type { OpenThrottleEnv } from '@openthrottle/react-router-utils';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import type { SettingsDiagnosticsLoaderData } from '../utils/settings-diagnostics-loader-data';
import {
  VITE_DEVTOOLS_DOC_HREF,
  VITE_DEVTOOLS_DOC_PROFILING_HREF,
} from '../utils/settings-docs-links';

const URL_MATRIX_ROWS: readonly {
  readonly key: keyof OpenThrottleEnv;
  readonly label: string;
}[] = [
  { key: 'API_URL_EXTERNAL', label: 'API (external)' },
  { key: 'API_URL_INTERNAL', label: 'API (internal)' },
  { key: 'APP_URL', label: 'APP_URL' },
  { key: 'APP_URL_ADMIN', label: 'Admin' },
  { key: 'APP_URL_CMS', label: 'CMS' },
  { key: 'APP_URL_DEVELOPER', label: 'Developer' },
  { key: 'APP_URL_EMAIL', label: 'Email' },
  { key: 'APP_URL_SERVER', label: 'Server' },
  { key: 'APP_URL_WEBSITE', label: 'Website' },
];

function normalizeUrlBase(url: string): string {
  return url.replace(/\/$/, '');
}

interface SettingsEnvironmentDiagnosticsProps extends SettingsDiagnosticsLoaderData {
  readonly className?: string;
  readonly idPrefix?: string;
}

/**
 * @description Build/version metadata and env-derived app URL matrix for support and misconfiguration triage.
 */
export function SettingsEnvironmentDiagnostics({
  className,
  env,
  idPrefix = 'settings-diagnostics',
  supportBundle,
}: SettingsEnvironmentDiagnosticsProps): React.ReactElement {
  const [origin, setOrigin] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (globalThis.window !== undefined) {
      setOrigin(globalThis.window.location.origin);
    }
  }, []);

  const handleCopySupportBundle = async (): Promise<void> => {
    const text = JSON.stringify(supportBundle, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const devPortalExpected = normalizeUrlBase(env.APP_URL_DEVELOPER);
  const originMatches =
    origin === null ? null : normalizeUrlBase(origin) === devPortalExpected;

  return (
    <div className={className ? `space-y-4 ${className}` : 'space-y-4'}>
      <Card className="bg-transparent">
        <CardHeader>
          <CardTitle className="text-base" id={`${idPrefix}-build`}>
            Build & environment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">APP_NAME</dt>
              <dd className="font-mono text-xs break-all">{env.APP_NAME}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">APP_VERSION</dt>
              <dd className="font-mono text-xs break-all">{env.APP_VERSION}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">APP_ENV</dt>
              <dd className="font-mono text-xs">{env.APP_ENV}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">NODE_ENV</dt>
              <dd className="font-mono text-xs">{env.NODE_ENV}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vite mode</dt>
              <dd className="font-mono text-xs">{import.meta.env.MODE}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="bg-transparent">
        <CardHeader>
          <CardTitle className="text-base" id={`${idPrefix}-vite-profiling`}>
            Local Vite profiling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            For bundle overlap and duplicate deps in dev, the repo enables{' '}
            <code className="text-xs">vite-bundle-analyzer</code> when{' '}
            <code className="text-xs">NODE_ENV=development</code>. For slow{' '}
            <span className="font-medium text-foreground">
              production builds
            </span>
            , run{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              pnpm nx run openthrottle-developer:build -- --profile
            </code>{' '}
            and open the generated <code className="text-xs">.cpuprofile</code>{' '}
            in Chrome Performance.
          </p>
          <p>
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={VITE_DEVTOOLS_DOC_PROFILING_HREF}
              rel="noreferrer"
              target="_blank"
            >
              Vite CLI build profiling (doc)
            </a>
            {' · '}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={VITE_DEVTOOLS_DOC_HREF}
              rel="noreferrer"
              target="_blank"
            >
              Full Vite &amp; devtools guide
            </a>
            {' · '}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              to="/settings/debug"
            >
              Settings → Debug
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card className="bg-transparent">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base" id={`${idPrefix}-urls`}>
            App & API URL matrix
          </CardTitle>
          <Button
            onClick={handleCopySupportBundle}
            size="sm"
            type="button"
            variant="outline"
          >
            Copy support bundle
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Values come from the built-in environment (see{' '}
            <code className="text-xs">.env</code> / deploy config). Use{' '}
            <span className="font-medium text-foreground">
              Copy support bundle
            </span>{' '}
            for tickets; secrets like{' '}
            <code className="text-xs">ROLLBAR_TOKEN</code> are masked.
          </p>
          {origin !== null && (
            <p
              className={
                originMatches
                  ? 'text-sm text-muted-foreground'
                  : 'text-sm text-amber-600 dark:text-amber-500'
              }
            >
              <span className="font-medium text-foreground">
                Browser origin:
              </span>{' '}
              <code className="text-xs">{origin}</code>
              {originMatches ? (
                <span> (matches APP_URL_DEVELOPER)</span>
              ) : (
                <span>
                  {' '}
                  — does not match{' '}
                  <code className="text-xs">{env.APP_URL_DEVELOPER}</code>{' '}
                  (check host, port, or reverse proxy)
                </span>
              )}
            </p>
          )}
          <div className="max-h-80 overflow-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted/80">
                <tr>
                  <th className="p-2 font-medium">Area</th>
                  <th className="p-2 font-medium">Key</th>
                  <th className="p-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {URL_MATRIX_ROWS.map((row) => (
                  <tr className="border-t" key={row.key}>
                    <td className="p-2 text-muted-foreground">{row.label}</td>
                    <td className="p-2 font-mono text-muted-foreground">
                      {row.key}
                    </td>
                    <td className="break-all p-2 font-mono">{env[row.key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

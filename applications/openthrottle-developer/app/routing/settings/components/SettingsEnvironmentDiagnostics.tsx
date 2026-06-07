import * as React from 'react';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { SETTINGS_PORTS_TROUBLESHOOTING_FRAGMENT_ID } from './SettingsPortsTroubleshootingCard';
import {
  VITE_DEVTOOLS_DOC_HREF,
  VITE_DEVTOOLS_DOC_PROFILING_HREF,
  VITE_DEVTOOLS_DOC_QUICK_REF_HREF,
} from '../utils/settings-docs-links';
import type { OpenThrottleEnv } from '@openthrottle/react-router-utils';
import type { SettingsDiagnosticsLoaderData } from '../utils/settings-diagnostics-loader-data';
import { MonitorCloudIcon } from 'lucide-react';

const URL_MATRIX_ROWS = [
  { key: 'API_URL_EXTERNAL' as const, label: 'API (external)' },
  { key: 'API_URL_INTERNAL' as const, label: 'API (internal)' },
  { key: 'APP_URL' as const, label: 'APP_URL' },
  { key: 'APP_URL_ADMIN' as const, label: 'Admin' },
  { key: 'APP_URL_CMS' as const, label: 'CMS' },
  { key: 'APP_URL_DEVELOPER' as const, label: 'Developer' },
  { key: 'APP_URL_EMAIL' as const, label: 'Email' },
  { key: 'APP_URL_SERVER' as const, label: 'Server' },
  { key: 'APP_URL_WEBSITE' as const, label: 'Website' },
] satisfies {
  key: keyof OpenThrottleEnv;
  label: string;
}[];

const normalizeUrlBase = (url: string): string => {
  return url.replace(/\/$/, '');
};

export interface SettingsEnvironmentDiagnosticsProps extends SettingsDiagnosticsLoaderData {
  className?: string;
  idPrefix?: string;
}

/**
 * @description Build/version metadata and env-derived app URL matrix for support and misconfiguration triage.
 */
export const SettingsEnvironmentDiagnostics = (
  props: SettingsEnvironmentDiagnosticsProps,
): React.ReactElement => {
  const { env, idPrefix = 'settings-diagnostics', supportBundle } = props;

  // Hooks
  const [origin, setOrigin] = React.useState<string | null>(null);

  // Setup
  const devPortalExpected = normalizeUrlBase(env.APP_URL_DEVELOPER);
  const originMatches =
    origin === null ? null : normalizeUrlBase(origin) === devPortalExpected;

  // Handlers
  const handleCopySupportBundle = async (): Promise<void> => {
    const text = JSON.stringify(supportBundle, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (globalThis.window !== undefined) {
      setOrigin(globalThis.window.location.origin);
    }
  }, []);

  // 🔌 Short Circuit

  return (
    <>
      <OpenThrottleFieldset
        icon={MonitorCloudIcon}
        id={`${idPrefix}-build`}
        legend="Environment Diagnostics"
      >
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
        </dl>
      </OpenThrottleFieldset>

      <OpenThrottleFieldset
        id={`${idPrefix}-vite-profiling`}
        legend="Local Vite profiling"
      >
        <div className="space-y-2 text-sm text-muted-foreground">
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
          <div className="mt-6 flex gap-4">
            <Badge color="yellow">
              <a
                href={VITE_DEVTOOLS_DOC_QUICK_REF_HREF}
                rel="noreferrer"
                target="_blank"
              >
                Quick reference
              </a>
            </Badge>
            {' · '}
            <Badge color="orange">
              <a href={VITE_DEVTOOLS_DOC_HREF} rel="noreferrer" target="_blank">
                Full Vite &amp; devtools guide
              </a>
            </Badge>
            {' · '}
            <Badge color="red">
              <a
                href={VITE_DEVTOOLS_DOC_PROFILING_HREF}
                rel="noreferrer"
                target="_blank"
              >
                Vite CLI build profiling
              </a>
            </Badge>
          </div>
        </div>
      </OpenThrottleFieldset>

      <OpenThrottleFieldset
        id={`${idPrefix}-urls`}
        legend="App & API URL matrix"
      >
        <p className="text-sm text-muted-foreground">
          Values come from the built-in environment (see{' '}
          <code className="text-xs">.env</code> / deploy config). Use{' '}
          <span className="font-medium text-foreground">
            Copy support bundle
          </span>{' '}
          for tickets; secrets like{' '}
          <code className="text-xs">ROLLBAR_TOKEN</code> are masked. For ports,{' '}
          <code className="text-xs">host.docker.internal</code>, and internal vs
          external API bases, see{' '}
          <Link
            className="text-primary underline-offset-4 hover:underline"
            to={`/settings/debug#${SETTINGS_PORTS_TROUBLESHOOTING_FRAGMENT_ID}`}
          >
            Settings → Debug: ports &amp; API troubleshooting
          </Link>
          .
        </p>
        {origin !== null && (
          <p
            className={
              originMatches
                ? 'text-sm text-muted-foreground'
                : 'text-sm text-amber-600 dark:text-amber-500'
            }
          >
            <span className="font-medium text-foreground">Browser origin:</span>{' '}
            <code className="text-xs">{origin}</code>
            {originMatches ? (
              <span> (matches APP_URL_DEVELOPER)</span>
            ) : (
              <span>
                {' '}
                — does not match{' '}
                <code className="text-xs">{env.APP_URL_DEVELOPER}</code> (check
                host, port, or reverse proxy)
              </span>
            )}
          </p>
        )}
        <div className="overflow-auto rounded-md border mt-8">
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
        <Button
          onClick={handleCopySupportBundle}
          size="sm"
          type="button"
          variant="outline"
        >
          Copy support bundle
        </Button>
      </OpenThrottleFieldset>
    </>
  );
};

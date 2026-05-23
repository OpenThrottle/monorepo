import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import {
  LOCAL_SERVICES_PORTS_DOC_HREF,
  LOCAL_SERVICES_PORTS_SERVICES_TABLE_HREF,
  VITE_DEVTOOLS_DOC_HREF,
} from '../utils/settings-docs-links';
import { BadgeInfoIcon } from 'lucide-react';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';

/**
 * @description Fragment id for deep links from Appearance diagnostics and bookmarks — stable URL: `/settings/debug#ports-hosts-api-troubleshooting`.
 */
export const SETTINGS_PORTS_TROUBLESHOOTING_FRAGMENT_ID = `ports-hosts-api-troubleshooting`;

export interface SettingsPortsTroubleshootingCardProps {}

/**
 * @description Focused troubleshooting for local dev: ports, hostnames, internal vs external API bases, Docker, and Caddy — complements the URL matrix on Appearance.
 */
export const SettingsPortsTroubleshootingCard = (
  _props: SettingsPortsTroubleshootingCardProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={BadgeInfoIcon}
      id={SETTINGS_PORTS_TROUBLESHOOTING_FRAGMENT_ID}
      legend="Local dev: ports, hosts & API URLs"
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">
            How requests resolve:
          </span>{' '}
          the browser calls <code className="text-xs">API_URL_EXTERNAL</code>;
          loaders, actions, and SSR use{' '}
          <code className="text-xs">API_URL_INTERNAL</code>. They should both
          reach the same openthrottle-server origin in typical local setups. If
          one is wrong you get{' '}
          <span className="font-medium text-foreground">
            client-only vs navigation-only
          </span>{' '}
          failures (e.g. hydration works but a loader 500s).
        </p>

        <p>
          <span className="font-medium text-foreground">
            Monorepo template (
            <code className="text-xs">
              applications/openthrottle-developer/.env.default
            </code>
            ):
          </span>{' '}
          <code className="text-xs">PORT=&quot;6020&quot;</code>,{' '}
          <code className="text-xs">API_URL_INTERNAL</code> /{' '}
          <code className="text-xs">API_URL_EXTERNAL</code> →{' '}
          <code className="text-xs">http://localhost:6021</code>,{' '}
          <code className="text-xs">APP_URL</code> /{' '}
          <code className="text-xs">APP_URL_DEVELOPER</code> →{' '}
          <code className="text-xs">http://localhost:6020</code>. Copy this file
          to <code className="text-xs">.env</code> in the app folder; without{' '}
          <code className="text-xs">PORT</code>, Vite falls back to{' '}
          <code className="text-xs">3000</code> (
          <code className="text-xs">vite.config.ts</code>
          ).
        </p>

        <div>
          <p className="mb-2 font-medium text-foreground">
            If something breaks, check in this order
          </p>
          <ol className="list-inside list-decimal space-y-1.5">
            <li>
              Confirm openthrottle-server is up on the port implied by your{' '}
              <code className="text-xs">API_URL_*</code> (template{' '}
              <code className="text-xs">6021</code> — see services table in the
              monorepo doc).
            </li>
            <li>
              Match your browser URL to{' '}
              <code className="text-xs">APP_URL_DEVELOPER</code> (Appearance
              diagnostics warn when they differ).
            </li>
            <li>
              Set <code className="text-xs">API_URL_INTERNAL</code> to an origin
              Node can reach from the Vite / SSR process (not always{' '}
              <code className="text-xs">localhost</code> from Docker).
            </li>
            <li>
              After changing <code className="text-xs">PORT</code> or{' '}
              <code className="text-xs">.env</code>, restart{' '}
              <code className="text-xs">nx run openthrottle-developer:dev</code>
              .
            </li>
          </ol>
        </div>

        <div>
          <p className="mb-2 font-medium text-foreground">Common mistakes</p>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <span className="font-medium text-foreground">Vite port:</span>{' '}
              <code className="text-xs">PORT</code> in{' '}
              <code className="text-xs">.env</code> overrides the Vite default
              (often <code className="text-xs">3000</code> in{' '}
              <code className="text-xs">vite.config.ts</code>); the template
              uses <code className="text-xs">6020</code>. Browse the port Vite
              prints on startup.
            </li>
            <li>
              <span className="font-medium text-foreground">
                External vs internal:
              </span>{' '}
              mismatched bases cause GraphQL or WebSocket issues only on some
              navigations; compare both URLs to your actual server URL.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Docker / containers:
              </span>{' '}
              <code className="text-xs">localhost</code> inside a container is
              not the host machine — use{' '}
              <code className="text-xs">host.docker.internal</code> (macOS /
              Windows; Linux may need host gateway or host IP) for{' '}
              <code className="text-xs">API_URL_INTERNAL</code> when the API
              runs on the host.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Reverse proxy / HTTPS:
              </span>{' '}
              Caddy path-based vs host-based setups must align{' '}
              <code className="text-xs">APP_URL_*</code> with the URL you open;
              WebSocket passthrough matters for Socket.IO.
            </li>
          </ul>
        </div>

        <div className="flex gap-4">
          <Badge color="yellow" size="xs">
            <a
              href={LOCAL_SERVICES_PORTS_SERVICES_TABLE_HREF}
              rel="noreferrer"
              target="_blank"
            >
              Local services &amp; ports (table)
            </a>
          </Badge>
          {' · '}
          <Badge color="orange" size="xs">
            <a
              href={LOCAL_SERVICES_PORTS_DOC_HREF}
              rel="noreferrer"
              target="_blank"
            >
              Full Caddy / hostname guide
            </a>
          </Badge>
          {' · '}
          <Badge color="red" size="xs">
            <a href={VITE_DEVTOOLS_DOC_HREF} rel="noreferrer" target="_blank">
              Vite &amp; devtools (analyzers)
            </a>
          </Badge>
        </div>
      </div>
    </OpenThrottleFieldset>
  );
};

import * as React from 'react';
import {
  VITE_DEVTOOLS_DOC_HREF,
  VITE_DEVTOOLS_DOC_PROFILING_HREF,
  VITE_DEVTOOLS_DOC_QUICK_REF_HREF,
} from '~/routing/settings/utils/settings-docs-links';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';

interface SettingsBuildToolsProps {}

export const SettingsBuildTools = (_props: SettingsBuildToolsProps) => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          React Router / Vite devtools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">When to open:</span> Use
          the bundle analyzer for chunk overlap, duplicate packages, or split
          issues. Use React Router DevTools when debugging routes, loaders, and
          actions. For slow production builds, use Vite{' '}
          <code className="text-xs">build --profile</code> (see profiling doc
          below). Enable <code className="text-xs">REACT_ROUTER_DEV_TOOLS</code>{' '}
          only for those sessions; leave it off for a quieter console day to
          day.
        </p>
        <p>
          Bundle analyzer,{' '}
          <code className="text-xs">vite-plugin-devtools-json</code>, and React
          Router DevTools hook order are documented here:
        </p>
        <p>
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={VITE_DEVTOOLS_DOC_QUICK_REF_HREF}
            rel="noreferrer"
            target="_blank"
          >
            Quick reference (when to enable what)
          </a>
          {' · '}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={VITE_DEVTOOLS_DOC_HREF}
            rel="noreferrer"
            target="_blank"
          >
            docs/monorepo/openthrottle-developer-vite-devtools.md (GitHub)
          </a>
          {' · '}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={VITE_DEVTOOLS_DOC_PROFILING_HREF}
            rel="noreferrer"
            target="_blank"
          >
            Vite CLI build profiling
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
  );
};

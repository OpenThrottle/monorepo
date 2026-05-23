import * as React from 'react';
import {
  VITE_DEVTOOLS_DOC_HREF,
  VITE_DEVTOOLS_DOC_PROFILING_HREF,
  VITE_DEVTOOLS_DOC_QUICK_REF_HREF,
} from '~/routing/settings/utils/settings-docs-links';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { ToolboxIcon } from 'lucide-react';
import { Badge } from '@openthrottle/react-router-shadcn';

export interface SettingsBuildToolsProps {}

export const SettingsBuildTools = (
  _props: SettingsBuildToolsProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={ToolboxIcon}
      id="react-router-vite-devtools"
      legend="React Router / Vite devtools"
    >
      <div className="space-y-3 text-sm text-muted-foreground">
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
        <div className="my-8 flex gap-4">
          <Badge color="yellow" size="xs">
            <a
              href={VITE_DEVTOOLS_DOC_QUICK_REF_HREF}
              rel="noreferrer"
              target="_blank"
            >
              Quick reference (when to enable what)
            </a>
          </Badge>
          {' · '}
          <Badge color="orange" size="xs">
            <a href={VITE_DEVTOOLS_DOC_HREF} rel="noreferrer" target="_blank">
              docs/monorepo/openthrottle-developer-vite-devtools.md (GitHub)
            </a>
          </Badge>
          {' · '}
          <Badge color="red" size="xs">
            <a
              href={VITE_DEVTOOLS_DOC_PROFILING_HREF}
              rel="noreferrer"
              target="_blank"
            >
              Vite CLI build profiling
            </a>
          </Badge>
        </div>
        <p>
          <span className="font-medium text-foreground">Clone path:</span>{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            docs/monorepo/openthrottle-developer-vite-devtools.md
          </code>
        </p>
      </div>
    </OpenThrottleFieldset>
  );
};

import * as React from 'react';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import type { Route } from '@/app/routes/+types/settings.debug';

const VITE_DEVTOOLS_DOC_HREF =
  'https://github.com/OpenThrottle/OpenThrottle/blob/main/docs/monorepo/openthrottle-developer-vite-devtools.md';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Debug',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

// export const loader = async (args: Route.LoaderArgs) => {
//   return {};
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `SettingsDebug | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <OpenThrottleEmptyState
        description="Vite levers for this app include REACT_ROUTER_DEV_TOOLS, dev-only bundle analysis, and vite-plugin-devtools-json. Full reference lives in the monorepo doc linked below."
        title="Debug — Vite & devtools"
      />
      <div className="mt-6 max-w-prose space-y-3 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Clone path:</span>{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            docs/monorepo/openthrottle-developer-vite-devtools.md
          </code>
        </p>
        <p>
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={VITE_DEVTOOLS_DOC_HREF}
            rel="noreferrer"
            target="_blank"
          >
            Open monorepo documentation (GitHub)
          </a>
        </p>
      </div>
      <hr className="my-8" />
    </GlobalScreen>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;

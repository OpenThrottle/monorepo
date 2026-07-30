import * as React from 'react';
import { Outlet } from 'react-router';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  DocsNav,
  DocsSearch,
  buildDocsNav,
} from '@openthrottle/react-router-docs';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { docsManifest } from '~/routing/docs/data/docsManifest';
import { useDocsFeatureFlags } from '~/global/hooks/useDocsFeatureFlags';
import type { Route } from '@/app/routes/+types/docs';

const docsNav = buildDocsNav(docsManifest, 'docs');

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => undefined,
  links: (_match) => [],
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const meta = (_args: Route.MetaArgs) => {
  return [];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks
  const [flags] = useDocsFeatureFlags();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
        <aside className="flex flex-col gap-4 md:w-56 md:shrink-0">
          {flags.search ? <DocsSearch entries={docsManifest} /> : null}
          <DocsNav groups={docsNav} />
        </aside>
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;

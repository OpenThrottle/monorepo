import * as React from 'react';
import { Outlet } from 'react-router';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { DocsNav, buildDocsNav } from '@openthrottle/react-router-docs';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { docsManifest } from '~/routing/docs/data/docsManifest';
import type { Route } from '@/app/routes/+types/docs';

type HandleData = Route.ComponentProps['loaderData'];

const docsNav = buildDocsNav(docsManifest, 'docs');

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Docs',
  links: (_match) => [],
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

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <DocsNav groups={docsNav} />
        </aside>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;

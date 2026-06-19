import * as React from 'react';
import { Outlet } from 'react-router';
import { DocsNav, buildDocsNav } from '@openthrottle/react-router-docs';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { docsManifest } from '~/routing/docs/data/docsManifest';
import type { Route } from '@/app/routes/+types/docs';

const docsNav = buildDocsNav(docsManifest, 'docs');

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
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
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <DocsNav groups={docsNav} />
        </aside>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </main>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;

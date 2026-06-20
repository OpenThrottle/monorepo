import * as React from 'react';
import { DocPageView } from '@openthrottle/react-router-docs';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { docsManifest } from '~/routing/docs/data/docsManifest';
import type { Route } from '@/app/routes/+types/docs._index';

const indexEntry = docsManifest.find((entry) => entry.path === '/docs');

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Docs | ${SITE_TITLE}` }];
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
  if (!indexEntry) {
    return (
      <p className="text-muted-foreground text-sm">
        No documentation index found. Add `app/docs-content/docs/index.md`.
      </p>
    );
  }

  return <DocPageView entry={indexEntry} />;
}

export const ErrorBoundary = GlobalErrorBoundary;

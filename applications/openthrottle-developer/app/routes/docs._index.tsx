import * as React from 'react';
import { DocPageView, DocsLanding } from '@openthrottle/react-router-docs';
import { SITE_TITLE } from '~/global/config/settings';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  docsNav,
  docsSequence,
  indexEntry,
} from '~/routing/docs/data/docs-navigation';
import { useDocsFeatureFlags } from '~/global/hooks/useDocsFeatureFlags';
import type { Route } from '@/app/routes/+types/docs._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Documentation',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Docs | ${SITE_TITLE}` }];
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
  if (!indexEntry) {
    return (
      <p className="text-muted-foreground text-sm">
        No documentation index found. Add `app/docs-content/docs/index.md`.
      </p>
    );
  }

  if (flags.landing) {
    return <DocsLanding groups={docsNav} intro={indexEntry} />;
  }

  return (
    <DocPageView
      codeCopy={flags.codeCopy}
      entry={indexEntry}
      prevNext={flags.prevNext}
      sequence={docsSequence}
      toc={flags.toc}
    />
  );
}

export const ErrorBoundary = GlobalErrorBoundary;

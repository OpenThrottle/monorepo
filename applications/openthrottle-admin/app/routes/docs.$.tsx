import * as React from 'react';
import { DocPageView } from '@openthrottle/react-router-docs';
import { SITE_TITLE } from '~/global/config/settings';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { docsBySlug } from '~/routing/docs/data/docs-navigation';
import type { Route } from '@/app/routes/+types/docs.$';

export const loader = async (args: Route.LoaderArgs) => {
  const entry = docsBySlug.get(`/docs/${args.params['*']}`);

  if (!entry) {
    throw new Response('Not Found', { status: 404 });
  }

  return { title: entry.title };
};

export const meta = (args: Route.MetaArgs) => {
  return [{ title: `${args.loaderData?.title ?? 'Docs'} | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { params } = props;

  // Hooks

  // Setup
  const entry = docsBySlug.get(`/docs/${params['*']}`);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!entry) {
    return <p className="text-muted-foreground text-sm">Page not found.</p>;
  }

  return <DocPageView entry={entry} />;
}

export const ErrorBoundary = GlobalErrorBoundary;

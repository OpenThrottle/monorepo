import * as React from 'react';
import {
  DocPageView,
  buildDocsNav,
  flattenDocsNav,
} from '@openthrottle/react-router-docs';
import { SITE_TITLE } from '~/global/config/settings';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
} from '@openthrottle/react-router-ui-global';
import { docsManifest } from '~/routing/docs/data/docsManifest';
import { useDocsFeatureFlags } from '~/global/hooks/useDocsFeatureFlags';
import type { Route } from '@/app/routes/+types/docs.$';

const docsBySlug = new Map(
  docsManifest
    .filter((entry) => entry.section === 'docs')
    .map((entry) => [entry.path, entry]),
);

const docsSequence = flattenDocsNav(buildDocsNav(docsManifest, 'docs'));

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.title,
  links: (_match) => [
    {
      children: 'Docs',
      to: '/docs',
    },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const entry = docsBySlug.get(`/docs/${args.params['*']}`);

  if (!entry) {
    throw new Response('Not Found', { status: 404 });
  }

  return { title: entry.title };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (args: Route.MetaArgs) => {
  return [{ title: `${args.loaderData?.title ?? 'Docs'} | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { params } = props;

  // Hooks
  const [flags] = useDocsFeatureFlags();

  // Setup
  const entry = docsBySlug.get(`/docs/${params['*']}`);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!entry) {
    return <p className="text-muted-foreground text-sm">Page not found.</p>;
  }

  return (
    <DocPageView
      codeCopy={flags.codeCopy}
      entry={entry}
      prevNext={flags.prevNext}
      sequence={docsSequence}
      toc={flags.toc}
    />
  );
}

export const ErrorBoundary = GlobalErrorBoundary;

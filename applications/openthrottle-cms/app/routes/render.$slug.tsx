import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { data } from 'react-router';

import type { Route } from '@/app/routes/+types/render.$slug';
import type { RenderCmsLayoutQuery } from '~/__generated__/graphql';
import { RenderCmsLayoutDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { fetchPublicGraphql } from '~/global/utils/graphql.server';
import { toCmsFragments } from '~/global/utils/toCmsFragments';
import { CmsLayoutPage } from '~/routing/render/components/CmsLayoutPage';
import { RENDER_COPY } from '~/routing/render/data/data.copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => RENDER_COPY.breadcrumb,
  links: (_match) => [],
};

/**
 * @description Loads the live layout for `slug` from openthrottle-server's public `cmsLayout`
 * query. Throws a 404 response for an unknown or soft-deleted slug and a 502 when the API fails,
 * both rendered by the error boundary.
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { params } = args;
  let layout: RenderCmsLayoutQuery['cmsLayout'];

  try {
    const result = await fetchPublicGraphql(RenderCmsLayoutDocument, {
      slug: params.slug,
    });

    layout = result.cmsLayout;
  } catch (error) {
    // The 502 page says the API failed; the server log says why.
    console.error(`render.$slug: cmsLayout("${params.slug}") failed`, error);
    throw data(RENDER_COPY.apiError, {
      status: 502,
      statusText: 'Bad Gateway',
    });
  }

  if (!layout) {
    throw data(RENDER_COPY.notFound, { status: 404, statusText: 'Not Found' });
  }

  return {
    fragments: toCmsFragments(layout.fragments),
    name: layout.name,
    slug: layout.slug,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (args: Route.MetaArgs) => {
  const name = args.loaderData?.name ?? RENDER_COPY.title;

  return [{ title: `${name} | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { fragments } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <CmsLayoutPage className={undefined} fragments={fragments} />;
}

export const ErrorBoundary = GlobalErrorBoundary;

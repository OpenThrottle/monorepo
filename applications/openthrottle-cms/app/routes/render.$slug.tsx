import { CMS_STATUS } from '@openthrottle/react-router-cms-core';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { data } from 'react-router';

import type { Route } from '@/app/routes/+types/render.$slug';
import type { RenderedCmsLayoutFragment } from '~/__generated__/graphql';
import { RenderCmsLayoutDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { fetchAuthGraphql } from '~/global/utils/graphql.server';
import { toCmsFragments } from '~/global/utils/toCmsFragments';
import { CmsLayoutPage } from '~/routing/render/components/CmsLayoutPage';
import { RENDER_COPY } from '~/routing/render/data/copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => RENDER_COPY.breadcrumb,
  links: (_match) => [],
};

/**
 * @description Loads the layout for `slug` from openthrottle-server's public `cmsLayout` query,
 * forwarding the visitor's sign-in. The server returns only ACTIVE layouts unless the caller may
 * write cms content, so a DRAFT or DISABLED slug is a 404 for the public and a preview for an
 * editor; a preview is sent `Cache-Control: private, no-store` so no shared cache keeps it.
 * Throws a 404 response for an unknown, unpublished or soft-deleted slug and a 502 when the API
 * fails, both rendered by the error boundary.
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { params, request } = args;
  let layout: RenderedCmsLayoutFragment | null | undefined;

  try {
    const result = await fetchAuthGraphql(request, RenderCmsLayoutDocument, {
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

  const page = {
    fragments: toCmsFragments(layout.fragments),
    name: layout.name,
    slug: layout.slug,
  };

  if (layout.status !== CMS_STATUS.ACTIVE) {
    return data(page, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  return data(page);
};

export const headers: Route.HeadersFunction = (args) => {
  return args.loaderHeaders;
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

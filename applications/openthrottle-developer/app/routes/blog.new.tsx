import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { redirect } from 'react-router';

import type { Route } from '@/app/routes/+types/blog.new';
import { PERMISSIONS } from '~/global/config/permissions';
import { SITE_TITLE } from '~/global/config/settings';
import { requirePermission } from '~/global/utils/utils.permissions.server';
import { runBlogPostCreateAction } from '~/routing/blog/actions/new';
import { BlogPostNewDraft } from '~/routing/blog/components/BlogPostNewDraft';
import { BLOG_COPY, BLOG_NEW_COPY } from '~/routing/blog/data/data.copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => BLOG_NEW_COPY.pageTitle,
  links: (_match) => [{ children: BLOG_COPY.pageTitle, to: '/blog' }],
};

export const loader = async (
  args: Route.LoaderArgs,
): Promise<Record<string, never>> => {
  await requirePermission(args.request, PERMISSIONS.BLOG_DRAFT);

  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [
    {
      title: `${BLOG_NEW_COPY.pageTitle} | ${BLOG_COPY.pageTitle} | ${SITE_TITLE}`,
    },
  ];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <BlogPostNewDraft error={actionData?.error ?? null} />
    </GlobalScreen>
  );
}

/**
 * Creates an empty DRAFT and redirects to its editor. The list's "New post"
 * button POSTs here directly; a plain GET of `/blog/new` renders a one-button
 * form that does the same.
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<Response | { readonly error: string }> => {
  await requirePermission(args.request, PERMISSIONS.BLOG_DRAFT);

  const result = await runBlogPostCreateAction(args.request);

  if (result.postId !== null) {
    return redirect(`/blog/${result.postId}`);
  }

  return { error: result.error };
};

export const ErrorBoundary = GlobalErrorBoundary;

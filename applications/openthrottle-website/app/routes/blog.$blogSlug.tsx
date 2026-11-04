import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/blog.$blogSlug';
import { BlogDetails } from '~/routing/blog/components/BlogDetails';
import { BlogErrorBoundary } from '~/routing/blog/components/BlogErrorBoundary';
import { BlogPageShell } from '~/routing/blog/components/BlogPageShell';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { loadBlogPost } from '~/routing/blog/utils/blog-loaders.server';
import { buildBlogPostMeta } from '~/routing/blog/utils/blog-seo';

export const loader = async (
  args: Route.LoaderArgs,
): ReturnType<typeof loadBlogPost> => {
  return loadBlogPost({ slug: args.params.blogSlug });
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) =>
  // `loaderData` is undefined when the loader threw (the 404 case).
  args.loaderData
    ? buildBlogPostMeta(args.loaderData.post)
    : [{ title: BLOG_COPY.emptyState.notFound.title }],
);

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { post } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <BlogPageShell>
      <BlogDetails post={post} />
    </BlogPageShell>
  );
}

export const ErrorBoundary = BlogErrorBoundary;

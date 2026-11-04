import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/blog._index';
import { BlogErrorBoundary } from '~/routing/blog/components/BlogErrorBoundary';
import { BlogList } from '~/routing/blog/components/BlogList';
import { BlogPageHeader } from '~/routing/blog/components/BlogPageHeader';
import { BlogPageShell } from '~/routing/blog/components/BlogPageShell';
import { BlogPagination } from '~/routing/blog/components/BlogPagination';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import {
  loadBlogIndex,
  readBlogCursor,
} from '~/routing/blog/utils/blog-loaders.server';
import { buildBlogIndexMeta } from '~/routing/blog/utils/blog-seo';
import { BLOG_BASE_PATH } from '~/routing/blog/utils/blog-urls';

export const loader = async (
  args: Route.LoaderArgs,
): ReturnType<typeof loadBlogIndex> => {
  return loadBlogIndex({ after: readBlogCursor(args.url) });
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta(() =>
  buildBlogIndexMeta(),
);

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { after, page } = loaderData;

  // Hooks

  // Setup
  const { heading, lede } = BLOG_COPY.routes.index;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <BlogPageShell>
      <BlogPageHeader description={lede} eyebrow={null} heading={heading} />
      <BlogList emptyKind="all" posts={page.items} />
      <BlogPagination
        basePath={BLOG_BASE_PATH}
        endCursor={page.endCursor}
        hasNextPage={page.hasNextPage}
        isFirstPage={after === null}
      />
    </BlogPageShell>
  );
}

export const ErrorBoundary = BlogErrorBoundary;

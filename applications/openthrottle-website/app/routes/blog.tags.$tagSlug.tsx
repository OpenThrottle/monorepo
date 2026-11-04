import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/blog.tags.$tagSlug';
import { BlogErrorBoundary } from '~/routing/blog/components/BlogErrorBoundary';
import { BlogList } from '~/routing/blog/components/BlogList';
import { BlogPageHeader } from '~/routing/blog/components/BlogPageHeader';
import { BlogPageShell } from '~/routing/blog/components/BlogPageShell';
import { BlogPagination } from '~/routing/blog/components/BlogPagination';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import {
  loadBlogTag,
  readBlogCursor,
} from '~/routing/blog/utils/blog-loaders.server';
import { buildBlogTagMeta } from '~/routing/blog/utils/blog-seo';
import { buildBlogTagPath } from '~/routing/blog/utils/blog-urls';

export const loader = async (
  args: Route.LoaderArgs,
): ReturnType<typeof loadBlogTag> => {
  return loadBlogTag({
    after: readBlogCursor(args.url),
    tagSlug: args.params.tagSlug,
  });
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) =>
  // `loaderData` is undefined when the loader threw (the 404 case).
  args.loaderData
    ? buildBlogTagMeta(args.loaderData.tag)
    : [{ title: BLOG_COPY.emptyState.notFound.title }],
);

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { after, page, tag } = loaderData;

  // Hooks

  // Setup
  const { description, eyebrow, heading } = BLOG_COPY.routes.tag;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <BlogPageShell>
      <BlogPageHeader
        description={tag.description || description(tag.name)}
        eyebrow={eyebrow}
        heading={heading(tag.name)}
      />
      <BlogList emptyKind="tag" posts={page.items} />
      <BlogPagination
        basePath={buildBlogTagPath(tag.slug)}
        endCursor={page.endCursor}
        hasNextPage={page.hasNextPage}
        isFirstPage={after === null}
      />
    </BlogPageShell>
  );
}

export const ErrorBoundary = BlogErrorBoundary;

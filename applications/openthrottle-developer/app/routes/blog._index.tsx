import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/blog._index';
import { GetBlogAdminPostsDocument } from '~/__generated__/graphql';
import { PERMISSIONS } from '~/global/config/permissions';
import { SITE_TITLE } from '~/global/config/settings';
import { requirePermission } from '~/global/utils/utils.permissions.server';
import { BlogPostsEmpty } from '~/routing/blog/components/BlogPostsEmpty';
import { BlogPostsIntroduction } from '~/routing/blog/components/BlogPostsIntroduction';
import { BlogPostsPagination } from '~/routing/blog/components/BlogPostsPagination';
import { BlogPostsTable } from '~/routing/blog/components/BlogPostsTable';
import { BlogPostStateTabs } from '~/routing/blog/components/BlogPostStateTabs';
import { BlogPostsToolbar } from '~/routing/blog/components/BlogPostsToolbar';
import { BLOG_POSTS_PAGE_SIZE } from '~/routing/blog/config/defaults';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { parseBlogListParams } from '~/routing/blog/utils/posts';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => BLOG_COPY.pageTitle,
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  await requirePermission(args.request, PERMISSIONS.BLOG_DRAFT);

  const searchParams = args.url?.searchParams ?? new URLSearchParams();
  const { after, search, state } = parseBlogListParams(searchParams);

  const { blogAdminPosts } = await executeGraphqlWithAuth(
    args.request,
    GetBlogAdminPostsDocument,
    { after, first: BLOG_POSTS_PAGE_SIZE, search, state: [state] },
  );

  return {
    after,
    endCursor: blogAdminPosts.endCursor ?? null,
    hasNextPage: blogAdminPosts.hasNextPage,
    posts: blogAdminPosts.items,
    search,
    state,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `${BLOG_COPY.pageTitle} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;
  const { after, endCursor, hasNextPage, posts, search, state } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <BlogPostsIntroduction />
      <div className="mt-6 flex flex-col gap-4">
        <BlogPostsToolbar />
        <BlogPostStateTabs state={state} />
        {posts.length === 0 ? (
          <BlogPostsEmpty search={search} state={state} />
        ) : (
          <>
            <BlogPostsTable posts={posts} />
            <BlogPostsPagination
              after={after}
              endCursor={endCursor}
              hasNextPage={hasNextPage}
            />
          </>
        )}
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;

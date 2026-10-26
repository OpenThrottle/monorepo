import type { Route } from '@/app/routes/+types/blog.rss[.]xml';
import { assertBlogEnabled } from '~/global/utils/blog-enabled';
import { loadBlogFeedPosts } from '~/routing/blog/utils/blog-feeds.server';
import { buildBlogRssXml } from '~/routing/blog/utils/blog-rss';

/**
 * `GET /blog/rss.xml` — a resource route (loader-only, no default export)
 * serving the latest 20 visible posts as RSS 2.0. The flat-route name
 * `blog.rss[.]xml` is a static `/blog/rss.xml` segment, which React Router
 * ranks above the `/blog/:blogSlug` param route. 404s while the blog switch is
 * off, like the other blog routes.
 */
export const loader = async (_args: Route.LoaderArgs): Promise<Response> => {
  assertBlogEnabled();

  const posts = await loadBlogFeedPosts();

  return new Response(buildBlogRssXml(posts), {
    headers: {
      'Cache-Control': 'public, max-age=900',
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};

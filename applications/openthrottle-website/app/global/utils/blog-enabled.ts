import { FEATURE_BLOG_ENABLED } from '@openthrottle/react-router-utils';
import { data } from 'react-router';

/**
 * The one switch for the blog. `FEATURE_BLOG_ENABLED` (public env tier, default
 * off) controls every blog surface: the Blog nav and footer links, the sitemap
 * blog entries, the three `/blog` route loaders and the RSS feed. While it is
 * off the blog ships dark — links and sitemap entries are absent and the blog
 * routes answer 404 without calling the API, so an unreachable API can never
 * turn a stray `/blog` hit into a 500.
 */

/** @description True when the blog is published on this deployment. */
export const isBlogEnabled = (): boolean => FEATURE_BLOG_ENABLED;

/**
 * @description Loader guard for the blog routes: throws a 404 `data()` response
 * while the blog is switched off, before any API request is made.
 */
export const assertBlogEnabled = (): void => {
  if (!isBlogEnabled()) {
    throw data(null, { status: 404 });
  }
};

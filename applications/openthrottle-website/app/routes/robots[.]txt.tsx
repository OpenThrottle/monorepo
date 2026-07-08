import { buildRobotsResponse } from '@openthrottle/react-router-utils';
import type { Route } from '@/app/routes/+types/robots[.]txt';

/**
 * `GET /robots.txt` — a resource route (loader-only) for the public marketing
 * site: allows all crawlers and advertises the sitemap via the shared
 * {@link buildRobotsResponse} helper.
 */
export const loader = (_args: Route.LoaderArgs): Response =>
  buildRobotsResponse({ sitemapPath: '/sitemap.xml' });

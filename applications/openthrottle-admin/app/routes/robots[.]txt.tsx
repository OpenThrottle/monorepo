import { buildRobotsResponse } from '@openthrottle/react-router-utils';
import type { Route } from '@/app/routes/+types/robots[.]txt';

/**
 * `GET /robots.txt` — this is an authenticated/internal app, so disallow all
 * crawlers (noindex) via the shared helper. See the per-app SEO policy in OT
 * plan 49a1efae.
 */
export const loader = (_args: Route.LoaderArgs): Response =>
  buildRobotsResponse({ disallowAll: true });

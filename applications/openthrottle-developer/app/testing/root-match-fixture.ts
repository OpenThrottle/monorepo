/**
 * @description Shared test fixture that builds a fully-typed `root` route match
 * for component tests that receive `Route.ComponentProps['matches']`. Route
 * components in this app ignore `matches`, so the root entry only needs to be a
 * structurally valid, minimal root loader payload. Compose it with the leaf
 * route entry (annotated as the route's own `Route.ComponentProps['matches']`)
 * so the tuple's literal `id` types are inferred without any type assertions.
 */

import { getPublicEnv } from '@openthrottle/react-router-utils';
import type { Route as RootRoute } from '@/app/+types/root';

type RootMatch = RootRoute.ComponentProps['matches'][0];

/** Builds a minimal-but-valid `root` route match entry for `matches` tuples. */
export const buildRootMatch = (): RootMatch => ({
  handle: undefined,
  id: 'root',
  loaderData: {
    canonical: 'http://localhost/',
    env: getPublicEnv(),
    rootLoaderDiagnostics: {},
    rootLoaderFailure: null,
    serverHealth: {
      api: 'unconfigured',
      database: 'unconfigured',
      redis: 'unconfigured',
      websocket: 'unconfigured',
    },
    user: null,
    userLoadOk: true,
  },
  params: {},
  pathname: '/',
});

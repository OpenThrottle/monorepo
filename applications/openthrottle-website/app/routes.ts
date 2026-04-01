import { type RouteConfig } from '@react-router/dev/routes';
import { flatRoutes } from '@react-router/fs-routes';

export default flatRoutes({
  ignoredRouteFiles: [
    '**/*.d.ts',
    '**/*.d.ts.map',
    '**/*.graphql.tmp',
    '**/*.graphql',
    '__tests__/**',
  ],
}) satisfies RouteConfig;

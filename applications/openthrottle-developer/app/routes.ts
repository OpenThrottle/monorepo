import { type RouteConfig } from '@react-router/dev/routes';
import { flatRoutes } from '@react-router/fs-routes';

// Explicitly annotated rather than inferred: the inferred type names
// `RouteConfigEntry` through a pnpm store path, which TypeScript rejects as
// non-portable (TS2883). The annotation keeps the type stable regardless of
// how pnpm lays out node_modules.
const routes: RouteConfig = flatRoutes({
  ignoredRouteFiles: [
    '**/*.d.ts',
    '**/*.d.ts.map',
    '**/*.graphql.tmp',
    '**/*.graphql',
    '__tests__/**',
  ],
});

export default routes;

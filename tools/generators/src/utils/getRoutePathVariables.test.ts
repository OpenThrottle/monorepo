import { describe, expect, test } from 'vitest';

import { getRoutePathVariables } from './getRoutePathVariables.ts';

describe('getRoutePathVariables', () => {
  test.each([
    ['overview._index', '/overview', '/overview'],
    ['components.$uuid', '/components/:uuid', '/components/test-uuid'],
    [
      'schemas.$uuid.create',
      '/schemas/:uuid/create',
      '/schemas/test-uuid/create',
    ],
    ['_auth.login', '/login', '/login'],
    ['_index', '/', '/'],
    ['files.$', '/files/*', '/files/test-splat'],
    ['robots[.]txt', '/robots.txt', '/robots.txt'],
    ['plans_.$planId', '/plans/:planId', '/plans/test-planId'],
  ])('%s -> %s', (name, routePath, routeEntry) => {
    expect(getRoutePathVariables(name)).toStrictEqual({
      routeEntry,
      routePath,
    });
  });
});

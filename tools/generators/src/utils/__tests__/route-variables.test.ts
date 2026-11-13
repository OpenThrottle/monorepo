import { describe, expect, test } from 'vitest';

import {
  getRoutePathVariables,
  getRouteTitleVariables,
} from '../route-variables.ts';

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

describe('getRouteTitleVariables', () => {
  test.each([
    ['settings.appearance', 'Appearance | Settings', 'Appearance'],
    ['notifications._index', 'Notifications', 'Notifications'],
    ['personas.create', 'Create persona | Personas', 'Create persona'],
    ['plans.$planId._index', 'Plan | Plans', 'Plan'],
    [
      'settings.repositories.$repositoryId.edit',
      'Edit repository | Repositories',
      'Edit repository',
    ],
    ['pull-requests._index', 'Pull requests', 'Pull requests'],
    ['settings.mcp._index', 'MCP | Settings', 'MCP'],
    ['ide.files', 'Files | IDE', 'Files'],
    ['components.$uuid', 'Component | Components', 'Component'],
    ['schemas.$uuid._index', 'Schema | Schemas', 'Schema'],
    ['render.$uuid', 'Render', 'Render'],
    ['$slug', 'Slug', 'Slug'],
  ])('%s -> %s', (name, nameTitle, nameTitleLeaf) => {
    expect(getRouteTitleVariables(name)).toStrictEqual({
      nameTitle,
      nameTitleLeaf,
    });
  });

  test('never emits a PascalCase scaffold identifier', () => {
    const { nameTitle } = getRouteTitleVariables('settings.appearance');

    expect(nameTitle).not.toMatch(/^[A-Z][a-z]+(?:[A-Z][a-z]+)+/);
  });

  test('falls back to a placeholder when every segment is ignored', () => {
    expect(getRouteTitleVariables('_index')).toStrictEqual({
      nameTitle: 'Untitled',
      nameTitleLeaf: 'Untitled',
    });
  });
});

import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, test } from 'vitest';

import { generatorReactRouterRoute } from './generator.route.ts';

describe('generatorReactRouterRoute', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
  });

  const application = 'openthrottle';
  const name = 'example.route._index';

  test('should run successfully', async () => {
    await generatorReactRouterRoute(tree, { application, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      'applications/openthrottle/app/routes/example.route._index.tsx',
      'applications/openthrottle/app/routes/example.route._index.tsx.graphql',
      'applications/openthrottle/app/routes/__tests__/example.route._index.test.tsx',
    ]);
  });

  test('emits a humanized title, not the PascalCase scaffold identifier', async () => {
    await generatorReactRouterRoute(tree, {
      application,
      name: 'settings.appearance',
    });

    const route = tree.read(
      'applications/openthrottle/app/routes/settings.appearance.tsx',
      'utf-8',
    );

    expect(route).toContain('title: `Appearance | Settings | ${SITE_TITLE}`');
    expect(route).not.toContain('SettingsAppearance');
  });

  test('mounts the spec through createRoutesStub at the route URL, with no cast', async () => {
    await generatorReactRouterRoute(tree, {
      application,
      name: 'components.$uuid',
    });

    const spec = tree.read(
      'applications/openthrottle/app/routes/__tests__/components.$uuid.test.tsx',
      'utf-8',
    );

    expect(spec).toContain('createRoutesStub');
    expect(spec).toContain(`path: '/components/:uuid'`);
    expect(spec).toContain(`initialEntries={['/components/test-uuid']}`);
    expect(spec).toContain(`findByRole('heading', { level: 1 })`);
    expect(spec).not.toMatch(/\bas (never|unknown)\b/);
  });

  test('titles a generic $param route after its parent section', async () => {
    await generatorReactRouterRoute(tree, {
      application,
      name: 'components.$uuid',
    });

    const route = tree.read(
      'applications/openthrottle/app/routes/components.$uuid.tsx',
      'utf-8',
    );

    expect(route).toContain(`breadcrumb: (_match) => 'Component'`);
    expect(route).not.toContain('Uuid');
  });

  test('emits a loader-only resource route for api.* names', async () => {
    await generatorReactRouterRoute(tree, { application, name: 'api.schemas' });

    const files = tree
      .listChanges()
      .map((change) => change.path)
      .filter((path) => path.startsWith('applications/'));
    const route = tree.read(
      'applications/openthrottle/app/routes/api.schemas.tsx',
      'utf-8',
    );

    expect(files).toStrictEqual([
      'applications/openthrottle/app/routes/api.schemas.tsx',
      'applications/openthrottle/app/routes/__tests__/api.schemas.test.tsx',
    ]);
    expect(route).toContain('export const loader');
    expect(route).not.toContain('export default');
  });
});

import { describe, expect, test, beforeEach } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { generatorReactRouterRoute } from './generator.route';

describe('generatorReactRouterRoute', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
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
});

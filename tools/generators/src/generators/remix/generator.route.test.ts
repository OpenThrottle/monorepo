import { describe, expect, test, beforeEach } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { generatorRemixRoute } from './generator.route';

describe('generatorRemixRoute', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const application = 'rocketcms';
  const name = 'example.route._index';

  test('should run successfully', async () => {
    await generatorRemixRoute(tree, { application, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      'applications/rocketcms/app/routes/example.route._index.tsx',
      'applications/rocketcms/app/routes/example.route._index.tsx.graphql.tmp',
      'applications/rocketcms/app/routes/__tests__/example.route._index.test.tsx',
    ]);
  });
});

import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { reactRouterGenerator } from './generator';

describe('reactRouterGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const type = 'component';
  const application = 'openthrottle';
  const folder = 'global/components';
  const name = 'TestComponentName';

  test('should run successfully', async () => {
    await reactRouterGenerator(tree, {
      application,
      folder,
      name,
      subGenerator: type,
    });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      'applications/openthrottle/app/global/components/TestComponentName.tsx',
      'applications/openthrottle/app/global/components/__tests__/TestComponentName.test.tsx',
    ]);
  });
});

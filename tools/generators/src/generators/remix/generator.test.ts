import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { remixGenerator } from './generator';

describe('remixGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const type = 'component';
  const application = 'rocketcms';
  const folder = 'global/components';
  const name = 'TestComponentName';

  test('should run successfully', async () => {
    await remixGenerator(tree, {
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
      'applications/rocketcms/app/global/components/TestComponentName.tsx',
      'applications/rocketcms/app/global/components/__tests__/TestComponentName.test.tsx',
    ]);
  });
});

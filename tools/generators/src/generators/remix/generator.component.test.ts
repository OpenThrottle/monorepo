import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { generatorRemixComponent } from './generator.component';

describe('generatorRemixComponent', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const application = 'openthrottle-website';
  const folder = 'global/components';
  const name = 'TestComponent';

  test('should run successfully', async () => {
    await generatorRemixComponent(tree, { application, folder, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      'applications/openthrottle-website/app/global/components/TestComponent.tsx',
      'applications/openthrottle-website/app/global/components/__tests__/TestComponent.test.tsx',
    ]);
  });
});

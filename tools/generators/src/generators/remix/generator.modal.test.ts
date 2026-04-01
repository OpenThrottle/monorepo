import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { generatorRemixModal } from './generator.modal';

describe('generatorRemixModal', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const application = 'rocketcms';
  const folder = 'global/components';
  const name = 'TestModal';

  test('should run successfully', async () => {
    await generatorRemixModal(tree, { application, folder, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      'applications/rocketcms/app/global/components/TestModal.tsx',
      'applications/rocketcms/app/global/components/__tests__/TestModal.test.tsx',
    ]);
  });
});

import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { generatorReactRouterModal } from './generator.modal';

describe('generatorReactRouterModal', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const application = 'openthrottle-website';
  const folder = 'global/components';
  const name = 'TestModal';

  test('should run successfully', async () => {
    await generatorReactRouterModal(tree, { application, folder, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      'applications/openthrottle-website/app/global/components/TestModal.tsx',
      'applications/openthrottle-website/app/global/components/__tests__/TestModal.test.tsx',
    ]);
  });
});

import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { reactGenerator } from './generator';

describe('reactGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const type = 'component';
  const target = '@openthrottle/shared-ui';
  const name = 'TestComponentName';

  test('should run successfully', async () => {
    await reactGenerator(tree, {
      destination: target,
      name,
      subGenerator: type,
    });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);
    const folderName = target.split('/').pop();

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      `packages/openthrottle/${folderName}/src/components/${name}.tsx`,
      `packages/openthrottle/${folderName}/src/components/__tests__/${name}.test.tsx`,
    ]);
  });
});

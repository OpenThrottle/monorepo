import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { componentGenerator } from './generator.component';

describe('componentGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const packageName = `shared-ui`;
  const target = `@openthrottle/${packageName}`;
  const name = 'TestComponent';

  test('should run successfully', async () => {
    await componentGenerator(tree, { destination: target, name });

    const changes = tree.listChanges();
    const files = changes
      .filter((change) => change.type === 'CREATE') // Doesn't help
      .map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      `packages/rocketcms/${packageName}/src/components/${name}.tsx`,
      `packages/rocketcms/${packageName}/src/components/__tests__/${name}.test.tsx`,
    ]);
  });
});

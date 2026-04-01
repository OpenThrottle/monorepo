import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { hookGenerator } from './generator.hook';

describe('hookGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const org = `@rocketcms`;
  const orgName = org.replace('@', '');
  const packageName = `shared-ui`;
  const target = `${org}/${packageName}`;
  const name = 'useExampleHook';

  test('should run successfully', async () => {
    await hookGenerator(tree, { destination: target, name });

    const changes = tree.listChanges();
    const files = changes
      .filter((change) => change.type === 'CREATE') // Doesn't help
      .map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      `packages/${orgName}/${packageName}/src/hooks/${name}.tsx`,
      `packages/${orgName}/${packageName}/src/hooks/__tests__/${name}.test.tsx`,
    ]);
  });
});

import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { utilGenerator } from './generator.util';

describe('utilGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const org = `@rocketcms`;
  const orgName = org.replace('@', '');
  const packageName = `shared-ui`;
  const target = `${org}/${packageName}`;
  const name = 'exampleUtil';

  test('should run successfully', async () => {
    await utilGenerator(tree, { destination: target, name });

    const changes = tree.listChanges();
    const files = changes
      .filter((change) => change.type === 'CREATE') // Doesn't help
      .map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      `packages/${orgName}/${packageName}/src/utils/${name}.tsx`,
      `packages/${orgName}/${packageName}/src/utils/__tests__/${name}.test.tsx`,
    ]);
  });
});

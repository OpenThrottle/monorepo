import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, test } from 'vitest';

import { reactRouterGenerator } from './generator';

describe('reactRouterGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
  });

  const type = 'component';
  const application = 'openthrottle-website';
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
      'applications/openthrottle-website/app/global/components/TestComponentName.tsx',
      'applications/openthrottle-website/app/global/components/__tests__/TestComponentName.test.tsx',
    ]);
  });

  test('refuses a --folder containing a junk-drawer segment', async () => {
    await expect(
      reactRouterGenerator(tree, {
        application,
        folder: 'routing/plans/lib',
        name,
        subGenerator: type,
      }),
    ).rejects.toThrow(
      /"lib", a junk-drawer folder name[\s\S]*Hint: use utils\//,
    );

    expect(
      tree
        .listChanges()
        .some((change) => change.path.startsWith('applications/')),
    ).toBe(false);
  });
});

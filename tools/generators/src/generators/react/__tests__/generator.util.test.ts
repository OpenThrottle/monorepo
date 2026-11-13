import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { utilGenerator } from '../generator.util.ts';

// The generator resolves `destination` through the real Nx project graph, whose
// first (cold) computation dominated this file's runtime — ~900ms of workspace
// scanning per test process, paid once per file across the cluster. Nothing here
// asserts graph construction; it asserts the emitted file set. `generator.test.ts`
// keeps the un-mocked path as the integration case.
vi.mock('@nx/devkit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nx/devkit')>();

  return {
    ...actual,
    createProjectGraphAsync: async () => ({
      dependencies: {},
      nodes: {
        '@openthrottle/react-router-ui': {
          data: { root: 'packages/react-router-ui' },
          name: '@openthrottle/react-router-ui',
          type: 'lib',
        },
      },
    }),
  };
});

describe('utilGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
  });

  const target = '@openthrottle/react-router-ui';
  const packageName = 'react-router-ui';
  const name = 'moveListItem';
  const utilPath = `packages/${packageName}/src/utils/moveListItem.ts`;
  const testPath = `packages/${packageName}/src/utils/__tests__/moveListItem.test.ts`;

  describe('when the name is camelCase', () => {
    test('writes camelCase .ts files named after the exported identifier', async () => {
      await utilGenerator(tree, { destination: target, name });

      const files = tree
        .listChanges()
        .filter((change) => change.type === 'CREATE')
        .map((change) => change.path);

      expect(files).toStrictEqual([
        '.prettierrc',
        'package.json',
        'nx.json',
        'tsconfig.base.json',
        utilPath,
        testPath,
      ]);
      expect(tree.read(utilPath, 'utf-8')).toContain(
        'export const moveListItem = ',
      );
      expect(tree.read(testPath, 'utf-8')).toContain(
        `import { moveListItem } from '../moveListItem';`,
      );
    });
  });

  describe('when a name is not camelCase', () => {
    test('rejects it, naming the bad value, and writes nothing', async () => {
      await expect(
        utilGenerator(tree, {
          destination: target,
          name: 'validName,move-list-item',
        }),
      ).rejects.toThrow(/Must be camel case: move-list-item/);

      const written = tree
        .listChanges()
        .map((change) => change.path)
        .filter((path) => path.startsWith('packages/'));

      expect(written).toStrictEqual([]);
    });
  });
});

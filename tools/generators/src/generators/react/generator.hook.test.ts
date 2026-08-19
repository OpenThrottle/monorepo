import { describe, expect, beforeEach, test, vi } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { hookGenerator } from './generator.hook';

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

describe('hookGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const target = '@openthrottle/react-router-ui';
  const packageName = 'react-router-ui';
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
      `packages/${packageName}/src/hooks/${name}.tsx`,
      `packages/${packageName}/src/hooks/__tests__/${name}.test.tsx`,
    ]);
  });
});

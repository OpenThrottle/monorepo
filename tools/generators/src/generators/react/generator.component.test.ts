import { describe, expect, beforeEach, test, vi } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { componentGenerator } from './generator.component';

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
        '@openthrottle/react-router-shadcn': {
          data: { root: 'packages/react-router-shadcn' },
          name: '@openthrottle/react-router-shadcn',
          type: 'lib',
        },
      },
    }),
  };
});

describe('componentGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const target = '@openthrottle/react-router-shadcn';
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
      `packages/react-router-shadcn/src/components/${name}.tsx`,
      `packages/react-router-shadcn/src/components/__tests__/${name}.test.tsx`,
    ]);

    const componentPath = `packages/react-router-shadcn/src/components/${name}.tsx`;
    const source = tree.read(componentPath, 'utf-8');

    expect(source).toBeDefined();
    expect(source).toContain(`export interface ${name}Props`);
    expect(source).not.toMatch(/readonly\s+className/);
    expect(source).toContain('props: TestComponentProps');
    // The props unpack is live and sits before // Hooks (not `_props` /
    // commented out) — the pre-Hooks unpack block.
    expect(source).toContain('const {} = props;');
    expect(source).not.toMatch(/\(_props:/);
    // The unpack sits before the first // Hooks marker (pre-Hooks block).
    expect(source).toMatch(/const \{\} = props;[\s\S]*\/\/ Hooks/);
    expect(source).toContain('// Hooks');
    expect(source).toContain('// Setup');
    expect(source).toContain('// Handlers');
    expect(source).toContain('// Markup');
    expect(source).toContain('// Life Cycle');
    expect(source).toContain('// 🔌 Short Circuit');
  });
});

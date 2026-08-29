import { describe, expect, beforeEach, test, vi } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { componentGenerator } from './react/generator.component';
import { generatorReactRouterComponent } from './react-router/generator.component';

vi.mock('@nx/devkit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nx/devkit')>();

  return {
    ...actual,
    createProjectGraphAsync: async () => ({
      dependencies: {},
      nodes: {
        '@openthrottle/react-router-shadcn': {
          data: {
            root: 'packages/react-router-shadcn',
            tags: ['technology:react', 'type:package'],
          },
          name: '@openthrottle/react-router-shadcn',
          type: 'lib',
        },
      },
    }),
  };
});

// Regenerating a component to check conventions used to overwrite a
// hand-written `__tests__/<Name>.test.tsx` with the starter stub and report it
// as `UPDATE`. One case per generator, since the fix is shared.
describe('generators do not clobber existing files', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const name = 'TestComponent';
  const handWritten = `// hand-written, must survive regeneration\n`;

  test('react-router component leaves an existing test file alone', async () => {
    const testPath =
      'applications/openthrottle-website/app/global/components/__tests__/TestComponent.test.tsx';
    tree.write(testPath, handWritten);

    await generatorReactRouterComponent(tree, {
      application: 'openthrottle-website',
      folder: 'global/components',
      name,
    });

    expect(tree.read(testPath, 'utf-8')).toBe(handWritten);
    expect(
      tree.exists(
        'applications/openthrottle-website/app/global/components/TestComponent.tsx',
      ),
    ).toBe(true);
  });

  test('react component leaves an existing test file alone', async () => {
    const testPath =
      'packages/react-router-shadcn/src/components/__tests__/TestComponent.test.tsx';
    tree.write(testPath, handWritten);

    await componentGenerator(tree, {
      destination: '@openthrottle/react-router-shadcn',
      name,
    });

    expect(tree.read(testPath, 'utf-8')).toBe(handWritten);
    expect(
      tree.exists(
        'packages/react-router-shadcn/src/components/TestComponent.tsx',
      ),
    ).toBe(true);
  });

  test('an existing component file is preserved too', async () => {
    const componentPath =
      'packages/react-router-shadcn/src/components/TestComponent.tsx';
    tree.write(componentPath, handWritten);

    await componentGenerator(tree, {
      destination: '@openthrottle/react-router-shadcn',
      name,
    });

    expect(tree.read(componentPath, 'utf-8')).toBe(handWritten);
  });

  test('no staging directory survives the run', async () => {
    await generatorReactRouterComponent(tree, {
      application: 'openthrottle-website',
      folder: 'global/components',
      name,
    });

    const staged = tree
      .listChanges()
      .map((change) => change.path)
      .filter((path) => path.startsWith('.tools-generators-staging'));

    expect(staged).toStrictEqual([]);
  });
});

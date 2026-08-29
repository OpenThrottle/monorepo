import { describe, expect, beforeEach, test, vi } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { reactRouterGenerator } from './generator';

// A trimmed graph standing in for the real workspace: one application, one
// scoped React package, one project that is neither. Mocked for the same reason
// generator.component.test.ts mocks it — a cold graph costs ~900ms per process.
vi.mock('@nx/devkit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nx/devkit')>();

  return {
    ...actual,
    createProjectGraphAsync: async () => ({
      dependencies: {},
      nodes: {
        '@openthrottle/nestjs-auth': {
          data: { root: 'packages/nestjs-auth', tags: ['type:package'] },
          name: '@openthrottle/nestjs-auth',
          type: 'lib',
        },
        '@openthrottle/react-router-chat': {
          data: {
            root: 'packages/react-router-chat',
            tags: ['technology:react', 'type:package'],
          },
          name: '@openthrottle/react-router-chat',
          type: 'lib',
        },
        'openthrottle-website': {
          data: {
            root: 'applications/openthrottle-website',
            tags: ['technology:react', 'type:application'],
          },
          name: 'openthrottle-website',
          type: 'app',
        },
      },
    }),
  };
});

describe('reactRouterGenerator --application validation', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const name = 'TestComponentName';

  test('names the corrective react command when handed a package', async () => {
    const run = reactRouterGenerator(tree, {
      application: '@openthrottle/react-router-chat',
      folder: 'global/components',
      name,
      subGenerator: 'component',
    });

    await expect(run).rejects.toThrow(/is a package, not an application/);
    await expect(run).rejects.toThrow(
      /@tools\/generators:react --subGenerator=component --destination=@openthrottle\/react-router-chat/,
    );
    // The failure it replaces — the one that got mistaken for "packages are
    // unsupported" — must no longer be what the agent sees.
    await expect(run).rejects.not.toThrow(/ENOENT/);
  });

  test('resolves an unscoped package name to its scoped project', async () => {
    const run = reactRouterGenerator(tree, {
      application: 'react-router-chat',
      folder: 'global/components',
      name,
      subGenerator: 'component',
    });

    await expect(run).rejects.toThrow(
      /--destination=@openthrottle\/react-router-chat/,
    );
  });

  test('lists the valid applications for an unknown value', async () => {
    const run = reactRouterGenerator(tree, {
      application: 'not-a-real-project',
      folder: 'global/components',
      name,
      subGenerator: 'component',
    });

    await expect(run).rejects.toThrow(/Invalid --application/);
    await expect(run).rejects.toThrow(/--list=applications/);
    await expect(run).rejects.toThrow(/openthrottle-website/);
  });

  test('rejects a project that is neither an application nor React', async () => {
    const run = reactRouterGenerator(tree, {
      application: '@openthrottle/nestjs-auth',
      folder: 'global/components',
      name,
      subGenerator: 'component',
    });

    await expect(run).rejects.toThrow(/Invalid --application/);
    await expect(run).rejects.not.toThrow(/is a package, not an application/);
  });

  test('a --folder inside packages/ points at the react generator', async () => {
    const run = reactRouterGenerator(tree, {
      application: 'openthrottle-website',
      folder: 'packages/react-router-chat/src/components',
      name,
      subGenerator: 'component',
    });

    await expect(run).rejects.toThrow(/Invalid folder/);
    await expect(run).rejects.toThrow(/is a path inside packages\//);
    await expect(run).rejects.not.toThrow(/ENOENT/);
  });

  test('a valid application still generates unchanged', async () => {
    await reactRouterGenerator(tree, {
      application: 'openthrottle-website',
      folder: 'global/components',
      name,
      subGenerator: 'component',
    });

    const files = tree.listChanges().map((change) => change.path);

    expect(files).toContain(
      'applications/openthrottle-website/app/global/components/TestComponentName.tsx',
    );
  });
});

import { describe, expect, beforeEach, test } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';
import { packageGenerator } from './generator';

describe('package generator', () => {
  let tree: Tree;

  describe('@tools', () => {
    const type = 'tools';
    const org = '@tools';
    const name = 'example-xxx-package';

    beforeEach(() => {
      tree = createTreeWithEmptyWorkspace();
    });

    test('should create a new "@tools" package', async () => {
      await packageGenerator(tree, { name, organization: org, type });
      const changes = tree.listChanges();
      const files = changes.map((change) => change.path);

      expect(files).toEqual(
        expect.arrayContaining([
          '.prettierrc',
          'package.json',
          'nx.json',
          'tsconfig.base.json',

          // Tools Package Scaffolding
          `tools/${name}/README.md`,
          `tools/${name}/eslint.config.ts`,
          `tools/${name}/package.json`,
          `tools/${name}/src/index.ts`,
          `tools/${name}/tsconfig.json`,
          `tools/${name}/tsconfig.lib.json`,
          `tools/${name}/tsconfig.test.json`,
          `tools/${name}/vite.config.ts`,
          `tools/${name}/vitest.config.ts`,
        ]),
      );
    });
  });

  describe('@organization', () => {
    const type = 'node';
    const org = '@openthrottle';
    const name = 'example-xxx-package';

    beforeEach(() => {
      tree = createTreeWithEmptyWorkspace();
    });

    test('should create a new "@tools" package', async () => {
      await packageGenerator(tree, { name, organization: org, type });
      const changes = tree.listChanges();
      const files = changes.map((change) => change.path);

      expect(files).toEqual(
        expect.arrayContaining([
          '.prettierrc',
          'package.json',
          'nx.json',
          'tsconfig.base.json',

          // Organization Package Scaffolding
          `packages/${name}/README.md`,
          `packages/${name}/eslint.config.ts`,
          `packages/${name}/package.json`,
          `packages/${name}/src/index.ts`,
          `packages/${name}/tsconfig.json`,
          `packages/${name}/tsconfig.lib.json`,
          `packages/${name}/tsconfig.test.json`,
          `packages/${name}/vite.config.ts`,
          `packages/${name}/vitest.config.ts`,
        ]),
      );
    });
  });
});

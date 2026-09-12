import type { Tree } from '@nx/devkit';
import { readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, test } from 'vitest';

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

    test('should add the package to root package.json as a workspace dependency', async () => {
      await packageGenerator(tree, { name, organization: org, type });
      const packageJson = readJson(tree, 'package.json');

      expect(packageJson.dependencies[`${org}/${name}`]).toBe('workspace:^');
    });

    test('should not generate a TODO.md', async () => {
      await packageGenerator(tree, { name, organization: org, type });
      const files = tree.listChanges().map((change) => change.path);

      expect(files).not.toContain(`tools/${name}/TODO.md`);
      expect(files.some((file) => file.endsWith('TODO.md'))).toBe(false);
    });

    test('should return a callback to run install + reference sync after flush', async () => {
      // The callback is returned (not invoked here) so the test never runs a
      // real pnpm install, nor the `@nx/js:typescript-sync` generator that
      // wires the new package into the root solution tsconfig. Nx invokes it
      // after flushing the Tree; when invoked it asserts the reference landed
      // and throws PROJECT_REFERENCE_NOT_WIRED if it did not.
      const callback = await packageGenerator(tree, {
        name,
        organization: org,
        type,
      });

      expect(typeof callback).toBe('function');
    });
  });

  describe('@organization', () => {
    const type = 'node';
    const org = '@openthrottle';
    const name = 'example-xxx-package';

    beforeEach(() => {
      tree = createTreeWithEmptyWorkspace();
    });

    test('should create a new "@openthrottle" package', async () => {
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

    test('should add the package to root package.json as a workspace dependency', async () => {
      await packageGenerator(tree, { name, organization: org, type });
      const packageJson = readJson(tree, 'package.json');

      expect(packageJson.dependencies[`${org}/${name}`]).toBe('workspace:^');
    });

    test('should not generate a TODO.md', async () => {
      await packageGenerator(tree, { name, organization: org, type });
      const files = tree.listChanges().map((change) => change.path);

      expect(files).not.toContain(`packages/${name}/TODO.md`);
      expect(files.some((file) => file.endsWith('TODO.md'))).toBe(false);
    });

    test('should return a callback to run install + sync after flush', async () => {
      const callback = await packageGenerator(tree, {
        name,
        organization: org,
        type,
      });

      expect(typeof callback).toBe('function');
    });
  });
});

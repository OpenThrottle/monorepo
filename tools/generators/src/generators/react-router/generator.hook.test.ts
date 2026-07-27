import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { generatorReactRouterHook } from './generator.hook';

describe('generatorReactRouterHook', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const application = 'openthrottle-developer';
  const folder = 'global';
  const name = 'useExampleHook';

  test('writes hook and colocated test under app/global/hooks/', async () => {
    await generatorReactRouterHook(tree, { application, folder, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      `applications/${application}/app/global/hooks/${name}.tsx`,
      `applications/${application}/app/global/hooks/__tests__/${name}.test.tsx`,
    ]);

    const hookPath = `applications/${application}/app/global/hooks/${name}.tsx`;
    const source = tree.read(hookPath, 'utf-8');

    expect(source).toBeDefined();
    expect(source).toContain(`export interface UseExampleHookOptions`);
    expect(source).toContain(`export const ${name}`);
    expect(source).toContain('// 🔌 Short Circuit');
  });

  test('writes hook under app/routing/<area>/hooks/ when folder is routing/<area>', async () => {
    const routingFolder = 'routing/plans';
    const routingName = 'usePlanOutputStream';

    await generatorReactRouterHook(tree, {
      application,
      folder: routingFolder,
      name: routingName,
    });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toContain(
      `applications/${application}/app/routing/plans/hooks/${routingName}.tsx`,
    );
    expect(files).toContain(
      `applications/${application}/app/routing/plans/hooks/__tests__/${routingName}.test.tsx`,
    );
  });

  test('comma-separated --name batch creates multiple hooks', async () => {
    const names = 'useExampleHook,useAnotherHook';

    await generatorReactRouterHook(tree, {
      application,
      folder,
      name: names,
    });

    const files = tree.listChanges().map((change) => change.path);

    expect(files).toContain(
      `applications/${application}/app/global/hooks/useExampleHook.tsx`,
    );
    expect(files).toContain(
      `applications/${application}/app/global/hooks/__tests__/useExampleHook.test.tsx`,
    );
    expect(files).toContain(
      `applications/${application}/app/global/hooks/useAnotherHook.tsx`,
    );
    expect(files).toContain(
      `applications/${application}/app/global/hooks/__tests__/useAnotherHook.test.tsx`,
    );
  });

  test('invalid non-camelCase name fails', async () => {
    await expect(
      generatorReactRouterHook(tree, {
        application,
        folder,
        name: 'UseExampleHook',
      }),
    ).rejects.toThrow(/Must be camel case/);
  });

  describe('missing required options', () => {
    test('missing application fails with a clear error', async () => {
      await expect(
        generatorReactRouterHook(tree, { folder, name }),
      ).rejects.toThrow(/Missing required option: "application"/);
    });

    test('missing folder fails with a clear error', async () => {
      await expect(
        generatorReactRouterHook(tree, { application, name }),
      ).rejects.toThrow(/No folder selected/);
    });

    test('missing name fails with a clear error', async () => {
      await expect(
        generatorReactRouterHook(tree, { application, folder }),
      ).rejects.toThrow(/Missing required option: "name"/);
    });
  });
});

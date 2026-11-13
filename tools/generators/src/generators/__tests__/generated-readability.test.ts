import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { lintReadability } from '@tools/dotfiles';
import { beforeEach, describe, expect, test } from 'vitest';

import { generatorReactRouterComponent } from '../react-router/generator.component.ts';
import { generatorReactRouterHook } from '../react-router/generator.hook.ts';
import { generatorReactRouterRoute } from '../react-router/generator.route.ts';

/**
 * Lints freshly generated output with the readability rules (OT plan
 * a8cb40e5), so a template that emits a concise named arrow, a wrapped
 * ternary, a wrapped quoted string, a JSX const under Short Circuit or a
 * misnamed `data/` file fails here rather than in the first project that
 * scaffolds it. Templates are never linted in place (`eslint.config.ts`
 * ignores `files/**`), so this is the only check on them.
 */

const lintGenerated = (tree: Tree): readonly string[] => {
  const sources = tree
    .listChanges()
    .filter((change) => /\.tsx?$/.test(change.path))
    .map((change) => {
      return { code: tree.read(change.path, 'utf-8') ?? '', path: change.path };
    });

  return lintReadability(sources);
};

describe('generated output passes the readability rules', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
  });

  test('react-router component', async () => {
    await generatorReactRouterComponent(tree, {
      application: 'openthrottle-developer',
      folder: 'routing/plans/components',
      name: 'ExampleCard',
    });

    expect(lintGenerated(tree)).toStrictEqual([]);
  });

  test('react-router hook', async () => {
    await generatorReactRouterHook(tree, {
      application: 'openthrottle-developer',
      folder: 'routing/plans',
      name: 'useExampleHook',
    });

    expect(lintGenerated(tree)).toStrictEqual([]);
  });

  test('react-router route', async () => {
    await generatorReactRouterRoute(tree, {
      application: 'openthrottle-developer',
      name: 'example.route._index',
    });

    expect(lintGenerated(tree)).toStrictEqual([]);
  });

  test('the check is live: a concise named arrow is reported', () => {
    tree.write('src/example.ts', 'export const f = (x: number) => x;\n');

    expect(lintGenerated(tree)).toStrictEqual([
      expect.stringContaining('openthrottle/named-function-block-body'),
    ]);
  });
});

import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { ESLint } from 'eslint';
import { join } from 'path';
import { beforeAll, describe, expect, test } from 'vitest';

import { generatorReactRouterRoute } from '../generator.route.ts';

/**
 * @description Lints generated route output with a real application's ESLint
 * config. Every route generated for openthrottle-cms needed `eslint --fix`
 * before it passed (OT plan 28bb709f); this keeps the template honest.
 */
const workspaceRoot = join(import.meta.dirname, '../../../../../..');
const application = 'openthrottle-cms';
const applicationRoot = join(workspaceRoot, 'applications', application);

const lintGenerated = async (
  eslint: ESLint,
  tree: Tree,
  relativePath: string,
): Promise<readonly string[]> => {
  const source = tree.read(
    join('applications', application, relativePath),
    'utf-8',
  );

  if (source === null) throw new Error(`Not generated: ${relativePath}`);

  const [result] = await eslint.lintText(source, {
    filePath: join(applicationRoot, relativePath),
  });

  return (result?.messages ?? []).map((message) => {
    return `${message.ruleId ?? 'parse'}: ${message.message}`;
  });
};

describe('generatorReactRouterRoute output passes the application lint', () => {
  let eslint: ESLint;

  beforeAll(() => {
    eslint = new ESLint({ cwd: applicationRoot });
  });

  const cases = [
    { name: 'overview._index', route: 'overview._index' },
    { name: 'components.$uuid', route: 'components.$uuid' },
    { name: 'api.schemas', route: 'api.schemas' },
  ] as const;

  test.each(cases)(
    '$name route and spec lint with zero messages',
    async ({ name, route }) => {
      const tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });

      await generatorReactRouterRoute(tree, { application, name });

      const [routeMessages, specMessages] = await Promise.all([
        lintGenerated(eslint, tree, `app/routes/${route}.tsx`),
        lintGenerated(eslint, tree, `app/routes/__tests__/${route}.test.tsx`),
      ]);

      expect(routeMessages).toStrictEqual([]);
      expect(specMessages).toStrictEqual([]);
    },
    30_000,
  );
});

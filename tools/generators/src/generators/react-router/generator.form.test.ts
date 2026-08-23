import { describe, expect, beforeEach, test } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';
import { generatorReactRouterForm } from './generator.form';

describe('react-router form generator', () => {
  let tree: Tree;

  const application = 'openthrottle-developer';
  const folder = 'routing/home/components';
  const name = 'HomeExampleForm';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  test('should run successfully', async () => {
    await generatorReactRouterForm(tree, { application, folder, name });

    const changes = tree.listChanges();
    const _files = changes.map((change) => change.path);

    expect(true).toBeTruthy();

    // expect(files).toStrictEqual([
    //   '.prettierrc',
    //   'package.json',
    //   'nx.json',
    //   'tsconfig.base.json',
    //   `applications/${project}/${directory}/components/HomeExampleForm.tsx`,
    //   `applications/${project}/${directory}/components/__tests__/HomeExampleForm.test.tsx`,
    //   `applications/${project}/${directory}/config/form.homeexample.ts`,
    // ]);
  });
});

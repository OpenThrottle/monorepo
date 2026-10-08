import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, test } from 'vitest';

import { foldersGenerator } from './generator';

describe('folders generator', () => {
  let tree: Tree;

  const application = 'nestjs-api';
  const folder = 'routing';
  const name = 'example-folder';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
  });

  test('should run successfully', async () => {
    await foldersGenerator(tree, { application, folder, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toEqual(
      expect.arrayContaining([
        '.prettierrc',
        'package.json',
        'nx.json',
        'tsconfig.base.json',

        // Application scaffolding
        `applications/${application}/app/routing/${name}/components/__tests__/.gitkeep`,
        `applications/${application}/app/routing/${name}/config/__tests__/.gitkeep`,
        `applications/${application}/app/routing/${name}/data/__tests__/.gitkeep`,
        `applications/${application}/app/routing/${name}/hooks/__tests__/.gitkeep`,
        `applications/${application}/app/routing/${name}/utils/__tests__/.gitkeep`,
      ]),
    );
  });

  test('refuses a junk-drawer area name', async () => {
    await expect(
      foldersGenerator(tree, { application, folder, name: 'common' }),
    ).rejects.toThrow(
      /"common", a junk-drawer folder name[\s\S]*promotion ladder/,
    );

    expect(
      tree.listChanges().some((change) => change.path.includes('/common/')),
    ).toBe(false);
  });
});

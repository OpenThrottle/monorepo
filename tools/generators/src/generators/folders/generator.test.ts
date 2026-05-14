import { describe, expect, beforeEach, test } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';
import { foldersGenerator } from './generator';

describe('folders generator', () => {
  let tree: Tree;

  const application = 'nestjs-api';
  const folder = 'routing';
  const name = 'example-folder';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
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
});

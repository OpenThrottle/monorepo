import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { generatorNestJSModule } from './generator.module';

describe('nestjs "module" generator', () => {
  let tree: Tree;

  const application = 'nestjs-api';
  const name = 'example-module';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generatorNestJSModule(tree, { application, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      `.prettierrc`,
      `package.json`,
      `nx.json`,
      `tsconfig.base.json`,

      // scaffolds the following files:
      `applications/${application}/src/modules/${name}/${name}.module.ts`,
      `applications/${application}/src/modules/${name}/${name}.service.test.ts`,
      `applications/${application}/src/modules/${name}/${name}.service.ts`,
    ]);
  });
});

import { describe, it, beforeEach, expect } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';
import { generatorNestJSSimpleService } from './generator.simple-service';

describe('nestjs-simple-service generator', () => {
  let tree: Tree;

  const application = 'accounts-central-api';
  const name = 'test-logs';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generatorNestJSSimpleService(tree, { application, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      `.prettierrc`,
      `package.json`,
      `nx.json`,
      `tsconfig.base.json`,
      `applications/${application}/src/services/${name}/test-logs.module.ts`,
      `applications/${application}/src/services/${name}/test-logs.service.test.ts`,
      `applications/${application}/src/services/${name}/test-logs.service.ts`,
      `applications/${application}/src/services/${name}/dto/.gitkeep`,
      `applications/${application}/src/services/${name}/entities/.gitkeep`,
      `applications/${application}/src/services/${name}/factories/.gitkeep`,
    ]);
  });
});

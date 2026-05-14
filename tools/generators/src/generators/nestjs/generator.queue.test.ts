import { describe, it, beforeEach, expect } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';
import { generatorNestJSQueue } from './generator.queue';

describe('nestjs "queue" generator', () => {
  let tree: Tree;

  const application = 'nestjs-api';
  const name = 'example-queue';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generatorNestJSQueue(tree, { application, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      `.prettierrc`,
      `package.json`,
      `nx.json`,
      `tsconfig.base.json`,

      // scaffolds the following files:
      `applications/${application}/src/queues/${name}/TODO.md`,
      `applications/${application}/src/queues/${name}/${name}.constants.ts`,
      `applications/${application}/src/queues/${name}/${name}.processor.test.ts`,
      `applications/${application}/src/queues/${name}/${name}.processor.ts`,
      `applications/${application}/src/queues/${name}/${name}.types.ts`,
    ]);
  });
});

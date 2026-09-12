import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { generatorNestJSAIAgent } from './generator.ai-agent';

describe('nestjs "ai-agent" generator', () => {
  let tree: Tree;

  const application = 'nestjs-api';
  const name = 'example-ai-agent';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generatorNestJSAIAgent(tree, { application, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      `.prettierrc`,
      `package.json`,
      `nx.json`,
      `tsconfig.base.json`,

      // scaffolds the following files:
      `applications/${application}/src/agents/${name}/${name}.module.ts`,
      `applications/${application}/src/agents/${name}/${name}.service.test.ts`,
      `applications/${application}/src/agents/${name}/${name}.service.ts`,
    ]);
  });
});

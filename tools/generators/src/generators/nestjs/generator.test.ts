import { describe, it, beforeEach, expect } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';
import { generatorNestJS } from './generator';

describe('nestjs generator', () => {
  let tree: Tree;

  // Generator type
  const generator = 'application';

  // Application generator inputs
  const name = 'test-nestjs-application';
  const port = 8765;
  const username = 'test-user';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generatorNestJS(tree, {
      name,
      port,
      subGenerator: generator,
      username,
    });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toEqual(
      expect.arrayContaining([
        '.prettierrc',
        'package.json',
        'nx.json',
        'tsconfig.base.json',

        // Application scaffolding
        `applications/${name}/.env.default`,
        `applications/${name}/.gitignore`,
        `applications/${name}/README.md`,
        `applications/${name}/eslint.config.mts`,
        `applications/${name}/langgraph.json`,
        `applications/${name}/package.json`,
        `applications/${name}/src/agents/.gitkeep`,
        `applications/${name}/src/app.controller.test.ts`,
        `applications/${name}/src/app.controller.ts`,
        `applications/${name}/src/app.module.ts`,
        `applications/${name}/src/app.service.test.ts`,
        `applications/${name}/src/app.service.ts`,
        `applications/${name}/src/main.ts`,
        `applications/${name}/src/modules/.gitkeep`,
        `applications/${name}/src/queues/.gitkeep`,
        `applications/${name}/src/services/.gitkeep`,
        `applications/${name}/tests/setup.ts`,
        `applications/${name}/tsconfig.app.json`,
        `applications/${name}/tsconfig.json`,
        `applications/${name}/vitest.config.ts`,
      ]),
    );
  });
});

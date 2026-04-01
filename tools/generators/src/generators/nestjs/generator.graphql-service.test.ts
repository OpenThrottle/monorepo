import { describe, it, beforeEach, expect } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';
import { generatorNestJSGraphQLService } from './generator.graphql-service';

describe('nestjs-graphql-service generator', () => {
  let tree: Tree;

  const application = 'accounts-central-api';
  const name = 'test-logs';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generatorNestJSGraphQLService(tree, { application, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      `.prettierrc`,
      `package.json`,
      `nx.json`,
      `tsconfig.base.json`,
      `applications/${application}/src/services/${name}/test-logs.module.ts`,
      `applications/${application}/src/services/${name}/test-logs.policy.ts`,
      `applications/${application}/src/services/${name}/test-logs.resolver.test.ts`,
      `applications/${application}/src/services/${name}/test-logs.resolver.ts`,
      `applications/${application}/src/services/${name}/test-logs.service.test.ts`,
      `applications/${application}/src/services/${name}/test-logs.service.ts`,
      `applications/${application}/src/services/${name}/dto/get-test-logs.args.ts`,
      `applications/${application}/src/services/${name}/entities/test-log.entity.ts`,
      `applications/${application}/src/services/${name}/factories/.gitkeep`,
    ]);
  });
});

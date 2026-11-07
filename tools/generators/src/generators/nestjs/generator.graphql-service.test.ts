import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { generatorNestJSGraphQLService } from './generator.graphql-service.ts';

describe('nestjs-graphql-service generator', () => {
  let tree: Tree;

  const application = 'nestjs-api';
  const name = 'test-logs';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
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
      `applications/${application}/src/graphql/${name}/test-logs-graphql.module.ts`,
      `applications/${application}/src/graphql/${name}/test-logs.input.ts`,
      `applications/${application}/src/graphql/${name}/test-logs.object.ts`,
      `applications/${application}/src/graphql/${name}/test-logs.resolver.test.ts`,
      `applications/${application}/src/graphql/${name}/test-logs.resolver.ts`,
      `applications/${application}/src/graphql/${name}/test-logs.service.test.ts`,
      `applications/${application}/src/graphql/${name}/test-logs.service.ts`,
    ]);
  });

  it('emits no nestjs-core or deep /src/ imports', async () => {
    await generatorNestJSGraphQLService(tree, { application, name });

    const generated = tree
      .listChanges()
      .filter((change) => change.path.endsWith('.ts'))
      .map((change) => tree.read(change.path, 'utf-8') ?? '');

    for (const source of generated) {
      expect(source).not.toMatch(/@openthrottle\/nestjs-core/);
      expect(source).not.toMatch(/@openthrottle\/[^'"]+\/src\//);
      expect(source).not.toMatch(/\bextends\s+Result\s*\(/);
      expect(source).not.toMatch(/\bPaginatedResult\s*\(/);
      expect(source).not.toMatch(/\bfrom\s+['"][^'"]*result\.entity['"]/);
      expect(source).not.toMatch(/\bPoliciesGuard\b/);
      expect(source).not.toMatch(/\bCheckPolicies\b/);
    }
  });
});

import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { generatorNestJSSimpleService } from './generator.simple-service.ts';

describe('nestjs-simple-service generator', () => {
  let tree: Tree;

  const application = 'nestjs-api';
  const name = 'test-logs';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
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
    ]);
  });

  it('emits no nestjs-core or deep /src/ imports', async () => {
    await generatorNestJSSimpleService(tree, { application, name });

    const generated = tree
      .listChanges()
      .filter((change) => change.path.endsWith('.ts'))
      .map((change) => tree.read(change.path, 'utf-8') ?? '');

    for (const source of generated) {
      expect(source).not.toMatch(/@openthrottle\/nestjs-core/);
      expect(source).not.toMatch(/@openthrottle\/[^'"]+\/src\//);
    }
  });
});

import { describe, expect, beforeEach, test } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { generatorReactRouterComponent } from './generator.component';

describe('generatorReactRouterComponent', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  const application = 'openthrottle-website';
  const folder = 'global/components';
  const name = 'TestComponent';

  test('should run successfully', async () => {
    await generatorReactRouterComponent(tree, { application, folder, name });

    const changes = tree.listChanges();
    const files = changes.map((change) => change.path);

    expect(files).toStrictEqual([
      '.prettierrc',
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      'applications/openthrottle-website/app/global/components/TestComponent.tsx',
      'applications/openthrottle-website/app/global/components/__tests__/TestComponent.test.tsx',
    ]);

    const componentPath =
      'applications/openthrottle-website/app/global/components/TestComponent.tsx';
    const source = tree.read(componentPath, 'utf-8');

    expect(source).toBeDefined();
    expect(source).toContain(`export interface ${name}Props`);
    expect(source).not.toMatch(/readonly\s+className/);
    expect(source).toMatch(
      /export const TestComponent = \(props: TestComponentProps\) =>/,
    );
    expect(source).toContain('// 🔌 Short Circuit');
  });
});

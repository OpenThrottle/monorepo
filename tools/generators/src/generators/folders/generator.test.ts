import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, test } from 'vitest';

import { foldersGenerator } from './generator.ts';

describe('folders generator', () => {
  let tree: Tree;

  const application = 'nestjs-api';
  const folder = 'routing';
  const name = 'example-folder';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
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

  test('refuses a junk-drawer area name', async () => {
    await expect(
      foldersGenerator(tree, { application, folder, name: 'common' }),
    ).rejects.toThrow(
      /"common", a junk-drawer folder name[\s\S]*promotion ladder/,
    );

    expect(
      tree.listChanges().some((change) => change.path.includes('/common/')),
    ).toBe(false);
  });

  test('emits valid CONSTANT_CASE identifiers for a hyphenated name', async () => {
    await foldersGenerator(tree, { application, folder, name: 'probe-area' });

    const root = `applications/${application}/app/routing/probe-area`;
    const copy = tree.read(`${root}/data/data.copy.ts`, 'utf-8');
    const defaults = tree.read(`${root}/config/defaults.ts`, 'utf-8');

    expect(copy).toContain('export const PROBE_AREA_NOT_FOUND_COPY = {');
    expect(defaults).toContain('export const DEFAULT_PROBE_AREA =');
    expect(`${copy}${defaults}`).not.toContain('PROBE-AREA');
  });

  test('imports what the generated formatter uses', async () => {
    await foldersGenerator(tree, { application, folder, name });

    const formatters = tree.read(
      `applications/${application}/app/routing/${name}/utils/formatters.ts`,
      'utf-8',
    );

    expect(formatters).toContain("import { format } from 'date-fns';");
  });
});

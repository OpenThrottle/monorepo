import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { lintNestjsFileContract } from '@tools/dotfiles';
import { beforeEach, describe, expect, test } from 'vitest';

import { generatorNestJSApplication } from './nestjs/generator.application.ts';
import { packageGenerator } from './package/generator.ts';

/**
 * Lints a freshly generated NestJS package and application with the NestJS
 * file contract (`openthrottle/nestjs-file-naming` + `nestjs-file-exports`),
 * scoped by the generated project's own `eslint.config.ts`. Any report fails,
 * whatever its severity, so the scaffold is clean before the rules reach
 * `error`. Templates are never linted in place (`eslint.config.ts` ignores
 * `files/**`), so this is the only check that a new project starts compliant.
 */

// Inside this package's node_modules, so the generated config's
// `@tools/dotfiles` import resolves and Vite never reads a template folder's
// EJS `package.json`.
const SCRATCH_ROOT = path.join(import.meta.dirname, '../../node_modules');

/**
 * @description Imports the generated project's `eslint.config.ts` and returns
 * its default export — the config the new project actually ships.
 */
const loadConfig = async (
  tree: Tree,
  projectRoot: string,
): Promise<readonly unknown[]> => {
  const source = tree.read(`${projectRoot}/eslint.config.ts`, 'utf-8');
  if (source === null) throw new Error(`${projectRoot}: no eslint.config.ts`);

  const scratch = mkdtempSync(path.join(SCRATCH_ROOT, '.nestjs-contract-'));
  try {
    const configPath = path.join(scratch, 'eslint.config.ts');
    writeFileSync(configPath, source);
    const module: unknown = await import(configPath);
    const hasDefault =
      typeof module === 'object' && module !== null && 'default' in module;
    const config: unknown = hasDefault ? module.default : undefined;
    if (!Array.isArray(config)) throw new Error(`${projectRoot}: no config`);
    return config;
  } finally {
    rmSync(scratch, { force: true, recursive: true });
  }
};

const lintGenerated = async (
  tree: Tree,
  projectRoot: string,
): Promise<readonly string[]> => {
  const config = await loadConfig(tree, projectRoot);
  const sources = tree
    .listChanges()
    .filter((change) => change.path.endsWith('.ts'))
    .map((change) => {
      return { code: tree.read(change.path, 'utf-8') ?? '', path: change.path };
    });

  return lintNestjsFileContract({ config, projectRoot, sources });
};

const APPLICATION_ROOT = 'applications/example-contract-app';

const generateApplication = async (tree: Tree): Promise<void> => {
  await generatorNestJSApplication(tree, {
    name: 'example-contract-app',
    port: 8765,
    username: 'test-user',
  });
};

const generatePackage = async (tree: Tree): Promise<void> => {
  await packageGenerator(tree, {
    name: 'example-contract',
    organization: '@openthrottle',
    type: 'nestjs',
  });
};

const MISNAMED_SERVICE = `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class MisnamedService {}\n`;

describe('generated NestJS output passes the NestJS file contract', () => {
  let tree: Tree;

  const projects = [
    { generate: generatePackage, kind: 'package', root: 'packages/example-contract' },
    { generate: generateApplication, kind: 'application', root: APPLICATION_ROOT },
  ] as const; // prettier-ignore

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
  });

  test.each(projects)('nestjs $kind', async ({ generate, root }) => {
    await generate(tree);

    expect(await lintGenerated(tree, root)).toStrictEqual([]);
  });

  // Without this, a template config that never spreads `nestjsEslintConfig`
  // would pass the test above with zero reports.
  test.each(projects)(
    'the $kind config enables the contract: a misnamed src-root service is reported',
    async ({ generate, root }) => {
      await generate(tree);
      tree.write(`${root}/src/misnamed.service.ts`, MISNAMED_SERVICE);

      expect(await lintGenerated(tree, root)).toStrictEqual([
        expect.stringContaining('openthrottle/nestjs-file-naming'),
      ]);
    },
  );

  test('the check honors the project config: the application exempts src/repl.ts', async () => {
    await generateApplication(tree);
    const config = await loadConfig(tree, APPLICATION_ROOT);
    const repl = {
      code: tree.read(`${APPLICATION_ROOT}/src/repl.ts`, 'utf-8') ?? '',
      path: `${APPLICATION_ROOT}/src/repl.ts`,
    };

    // The template's last block is the `src/repl.ts` exemption.
    const withoutExemption = config.slice(0, -1);
    expect(
      lintNestjsFileContract({
        config: withoutExemption,
        projectRoot: APPLICATION_ROOT,
        sources: [repl],
      }),
    ).toStrictEqual([
      expect.stringContaining('openthrottle/nestjs-file-naming'),
    ]);
  });
});

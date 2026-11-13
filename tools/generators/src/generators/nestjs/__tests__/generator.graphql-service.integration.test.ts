import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { Tree } from '@nx/devkit';
import { workspaceRoot } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generatorNestJSGraphQLService } from '../generator.graphql-service.ts';

/**
 * Templates under `files/**` are never typechecked in place. This suite
 * scaffolds into a disposable folder under openthrottle-server and runs a
 * focused `tsc --noEmit` so a missing package (e.g. @openthrottle/nestjs-core)
 * or a bad relative import fails here instead of on first real scaffold.
 */

const SERVER_APPLICATION = 'openthrottle-server';
const SMOKE_FEATURE = 'nestjs-generator-smoke';
const SMOKE_RELATIVE_DIR = `applications/${SERVER_APPLICATION}/src/graphql/${SMOKE_FEATURE}`;
const SMOKE_TSCONFIG_RELATIVE = `applications/${SERVER_APPLICATION}/tsconfig.generator-smoke.json`;
const TYPECHECK_TIMEOUT_MS = 60_000;

const tscBin = process.env['OPENTHROTTLE_TSC_BIN'] ?? 'tsc6';

const smokeDirAbsolute = join(workspaceRoot, SMOKE_RELATIVE_DIR);
const smokeTsconfigAbsolute = join(workspaceRoot, SMOKE_TSCONFIG_RELATIVE);

const isExecFileFailure = (
  error: unknown,
): error is { readonly stderr: string; readonly stdout: string } => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if (!('stdout' in error) || !('stderr' in error)) {
    return false;
  }

  return typeof error.stdout === 'string' && typeof error.stderr === 'string';
};

const removeSmokeArtifacts = (): void => {
  rmSync(smokeDirAbsolute, { force: true, recursive: true });
  rmSync(smokeTsconfigAbsolute, { force: true });
};

const writeSmokeTsconfig = (): void => {
  const contents = `{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "composite": false,
    "declaration": false,
    "declarationMap": false,
    "noEmit": true,
    "tsBuildInfoFile": null
  },
  "include": [
    "src/graphql/${SMOKE_FEATURE}/**/*.ts",
    "src/guards/**/*.ts"
  ],
  "exclude": [
    "src/graphql/${SMOKE_FEATURE}/**/*.test.ts",
    "src/guards/**/*.test.ts"
  ],
  "references": []
}
`;

  writeFileSync(smokeTsconfigAbsolute, contents);
};

const flushGeneratedSourcesToServer = (tree: Tree): void => {
  removeSmokeArtifacts();
  mkdirSync(smokeDirAbsolute, { recursive: true });

  const sourceChanges = tree.listChanges().filter((change) => {
    return (
      change.path.startsWith(`${SMOKE_RELATIVE_DIR}/`) &&
      change.path.endsWith('.ts') &&
      !change.path.endsWith('.test.ts')
    );
  });

  for (const change of sourceChanges) {
    const content = tree.read(change.path, 'utf-8');
    if (content === null) {
      continue;
    }

    const absolutePath = join(workspaceRoot, change.path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
  }

  writeSmokeTsconfig();
};

const typecheckSmokeFeature = (): string => {
  try {
    execFileSync(tscBin, ['--noEmit', '-p', 'tsconfig.generator-smoke.json'], {
      cwd: join(workspaceRoot, `applications/${SERVER_APPLICATION}`),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return '';
  } catch (error: unknown) {
    if (isExecFileFailure(error)) {
      return `${error.stdout}${error.stderr}`;
    }

    throw error;
  }
};

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
      `applications/${application}/src/graphql/${name}/test-logs.input.ts`,
      `applications/${application}/src/graphql/${name}/test-logs.module.ts`,
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

describe('generated graphql-service typechecks inside openthrottle-server', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ formatter: 'prettier' });
    removeSmokeArtifacts();
  });

  afterEach(() => {
    removeSmokeArtifacts();
  });

  it(
    'passes for scaffolded source files',
    async () => {
      await generatorNestJSGraphQLService(tree, {
        application: SERVER_APPLICATION,
        name: SMOKE_FEATURE,
      });

      flushGeneratedSourcesToServer(tree);

      expect(typecheckSmokeFeature()).toBe('');
    },
    TYPECHECK_TIMEOUT_MS,
  );

  it(
    'fails when a file imports the nonexistent @openthrottle/nestjs-core',
    () => {
      mkdirSync(smokeDirAbsolute, { recursive: true });
      writeFileSync(
        join(smokeDirAbsolute, 'broken.ts'),
        `import { Result } from '@openthrottle/nestjs-core';\nexport const x = Result;\n`,
      );
      writeSmokeTsconfig();

      expect(typecheckSmokeFeature()).toMatch(
        /Cannot find module '@openthrottle\/nestjs-core'/,
      );
    },
    TYPECHECK_TIMEOUT_MS,
  );
});

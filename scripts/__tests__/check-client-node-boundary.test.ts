import {
  glob,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';
import { build } from 'vite';

import {
  findExternalizedBuiltins,
  findLikelyImporters,
  type BuildAsset,
} from '../check-client-node-boundary.ts';

/**
 * The fixture reproduces the ACTUAL shape of the break (OT plan a69a8b4c): a client
 * module imports a package BARREL, and one sibling module behind that barrel imports
 * `node:os`. Nothing imports the Node-touching export — reachability through the
 * barrel is the whole bug. A direct `import 'node:os'` from client code is the easy
 * case and was never what happened.
 *
 * The build is real rather than a hand-written string so the test also pins Vite's
 * stub wording: if a Vite upgrade changes it, this fails loudly instead of the guard
 * silently going blind.
 */

const FIXTURE_SOURCES = {
  'barrel.ts': `export * from './pure.ts';\nexport * from './node-touching.ts';\n`,
  'entry.ts': `import { greet } from './barrel.ts';\n\ndocument.title = greet('world');\n`,
  'node-touching.ts': `import { homedir } from 'node:os';\n\nexport const home = (): string => homedir();\n`,
  'pure.ts': `export const greet = (name: string): string => \`hi \${name}\`;\n`,
} as const;

const CONTROL_SOURCES = {
  'barrel.ts': `export * from './pure.ts';\n`,
  'entry.ts': `import { greet } from './barrel.ts';\n\ndocument.title = greet('world');\n`,
  'pure.ts': `export const greet = (name: string): string => \`hi \${name}\`;\n`,
} as const;

const workspaces: string[] = [];

const buildFixture = async (
  sources: Record<string, string>,
): Promise<BuildAsset[]> => {
  const root = await mkdtemp(join(tmpdir(), 'client-boundary-'));

  workspaces.push(root);
  await mkdir(root, { recursive: true });

  await Promise.all(
    Object.entries(sources).map(([file, contents]) =>
      writeFile(join(root, file), contents, 'utf8'),
    ),
  );

  const outDir = join(root, 'build', 'client');

  await build({
    build: {
      minify: false,
      outDir,
      rollupOptions: { input: join(root, 'entry.ts') },
      write: true,
    },
    configFile: false,
    logLevel: 'silent',
    root,
  });

  const emitted = await Array.fromAsync(glob('**/*.js', { cwd: outDir }));

  return Promise.all(
    emitted.map(async (file) => ({
      contents: await readFile(join(outDir, file), 'utf8'),
      file,
    })),
  );
};

afterAll(async () => {
  await Promise.all(
    workspaces.map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('findExternalizedBuiltins over a real Vite build', () => {
  it('flags a node builtin reached transitively through a barrel', async () => {
    const assets = await buildFixture({ ...FIXTURE_SOURCES });

    expect(assets.length).toBeGreaterThan(0);
    expect(
      findExternalizedBuiltins(assets).map(({ builtin }) => builtin),
    ).toEqual(['node:os']);
  });

  it('passes when the barrel re-exports only browser-safe modules', async () => {
    const assets = await buildFixture({ ...CONTROL_SOURCES });

    expect(assets.length).toBeGreaterThan(0);
    expect(findExternalizedBuiltins(assets)).toEqual([]);
  });
});

describe('findExternalizedBuiltins', () => {
  it('returns nothing for assets with no stub', () => {
    expect(
      findExternalizedBuiltins([
        { contents: 'export const a = 1;', file: 'a.js' },
      ]),
    ).toEqual([]);
  });

  it('deduplicates repeated stubs for the same builtin in one asset', () => {
    const stub =
      'Module "node:fs" has been externalized for browser compatibility';

    expect(
      findExternalizedBuiltins([
        { contents: `${stub} ... ${stub}`, file: 'a.js' },
      ]),
    ).toEqual([{ builtin: 'node:fs', file: 'a.js' }]);
  });

  it('reports each builtin separately', () => {
    const violations = findExternalizedBuiltins([
      {
        contents: [
          'Module "node:os" has been externalized for browser compatibility.',
          'Module "node:path" has been externalized for browser compatibility.',
        ].join('\n'),
        file: 'a.js',
      },
    ]);

    expect(violations.map(({ builtin }) => builtin)).toEqual([
      'node:os',
      'node:path',
    ]);
  });
});

describe('findLikelyImporters', () => {
  it('names non-server sources that import the builtin', () => {
    expect(
      findLikelyImporters(
        ['node:os'],
        [
          {
            contents: `import { homedir } from 'node:os';`,
            file: 'packages/nodejs-utils/src/utils/expand-home.ts',
          },
          {
            contents: `export const isRecord = () => true;`,
            file: 'packages/nodejs-utils/src/utils/is-record.ts',
          },
        ],
      ),
    ).toEqual(['packages/nodejs-utils/src/utils/expand-home.ts']);
  });

  it('ignores a bare mention that is not an import statement', () => {
    expect(
      findLikelyImporters(
        ['node:os'],
        [
          {
            contents: `// never import node:os from client code`,
            file: 'packages/nodejs-utils/src/utils/is-record.ts',
          },
        ],
      ),
    ).toEqual([]);
  });

  it('excludes test files, which are not bundled for the browser', () => {
    expect(
      findLikelyImporters(
        ['node:os'],
        [
          {
            contents: `import { homedir } from 'node:os';`,
            file: 'packages/openthrottle-skills/src/__tests__/walk.test.ts',
          },
        ],
      ),
    ).toEqual([]);
  });

  it('excludes server-only modules, which never enter the client bundle', () => {
    expect(
      findLikelyImporters(
        ['node:os'],
        [
          {
            contents: `import { homedir } from 'node:os';`,
            file: 'applications/openthrottle-developer/app/global/utils/ide-engine.server.ts',
          },
        ],
      ),
    ).toEqual([]);
  });
});

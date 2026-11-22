import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from 'vite';
import { afterAll, describe, expect, it } from 'vitest';

import {
  clientNodeBoundary,
  formatClientNodeBoundaryError,
} from '../clientNodeBoundary.ts';

/**
 * The fixture reproduces the ACTUAL shape of the original break (OT plan a69a8b4c): a
 * client module imports a package BARREL, and one sibling module behind that barrel
 * imports `node:os`. Nothing uses the Node-touching export; reaching it through the
 * barrel is the whole bug.
 *
 * The build is real rather than mocked so a Vite upgrade that changes how builtins are
 * externalized fails here instead of leaving the guard blind — which is exactly what
 * Vite 8.3 did to the earlier guard that scanned build output for Vite's stub wording.
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

const buildFixture = async (sources: Record<string, string>): Promise<void> => {
  const root = await mkdtemp(join(tmpdir(), 'client-boundary-'));

  workspaces.push(root);

  await Promise.all(
    Object.entries(sources).map(([file, contents]) => {
      return writeFile(join(root, file), contents, 'utf8');
    }),
  );

  await build({
    build: {
      outDir: join(root, 'build', 'client'),
      rollupOptions: { input: join(root, 'entry.ts') },
      write: false,
    },
    configFile: false,
    logLevel: 'silent',
    mode: 'production',
    plugins: [clientNodeBoundary()],
    root,
  });
};

afterAll(async () => {
  await Promise.all(
    workspaces.map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('clientNodeBoundary over a real Vite build', () => {
  it('fails on a node builtin reached through a barrel, naming the importer', async () => {
    await expect(buildFixture({ ...FIXTURE_SOURCES })).rejects.toThrow(
      /node:os ← node-touching\.ts/,
    );
  });

  it('lists an import reached from two client modules once', async () => {
    const error: unknown = await buildFixture({
      ...FIXTURE_SOURCES,
      'entry.ts': `import { greet } from './barrel.ts';\nimport { home } from './node-touching.ts';\n\ndocument.title = greet(String(home));\n`,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    const message = error instanceof Error ? error.message : '';

    expect(message.match(/node:os ← node-touching\.ts/g)).toHaveLength(1);
  });

  it('passes a client graph that never reaches a node builtin', async () => {
    await expect(buildFixture({ ...CONTROL_SOURCES })).resolves.toBeUndefined();
  });
});

describe('formatClientNodeBoundaryError', () => {
  it('lists each specifier with its importer relative to the root', () => {
    const message = formatClientNodeBoundaryError(
      [
        { importer: '/repo/packages/a/src/home.ts', specifier: 'node:os' },
        { importer: '/repo/packages/b/src/fs.ts', specifier: 'fs' },
      ],
      '/repo',
    );

    expect(message).toContain('node:os ← packages/a/src/home.ts');
    expect(message).toContain('fs ← packages/b/src/fs.ts');
  });

  it('falls back to the absolute path when the importer is the root itself', () => {
    const message = formatClientNodeBoundaryError(
      [{ importer: '/repo/app/root.tsx', specifier: 'node:path' }],
      '/repo/app/root.tsx',
    );

    expect(message).toContain('node:path ← /repo/app/root.tsx');
  });
});

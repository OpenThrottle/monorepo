import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { stripWorkspaceTypes } from './workspace-type-stripping.ts';

const WORKSPACE_URL =
  'file:///app/node_modules/.pnpm/@openthrottle+nodejs-utils@file+packages+nodejs-utils/node_modules/@openthrottle/nodejs-utils/src/index.ts';
const TYPED_SOURCE =
  'export const double = (value: number): number => value * 2;\n';

describe('stripWorkspaceTypes', () => {
  const scratchDirs: string[] = [];

  afterEach(() => {
    for (const dir of scratchDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('strips an ESM workspace package loaded from under node_modules', () => {
    const result = stripWorkspaceTypes(WORKSPACE_URL, {
      format: 'module-typescript',
      source: TYPED_SOURCE,
    });

    expect(result.format).toBe('module');
    expect(result.source).not.toContain(': number');
    expect(result.source).toContain('export const double = (value');
  });

  it('maps CommonJS TypeScript to commonjs', () => {
    const url = 'file:///app/node_modules/@tools/workflows/src/index.cts';

    expect(
      stripWorkspaceTypes(url, {
        format: 'commonjs-typescript',
        source: TYPED_SOURCE,
      }).format,
    ).toBe('commonjs');
  });

  it('decodes a binary source', () => {
    const result = stripWorkspaceTypes(WORKSPACE_URL, {
      format: 'module-typescript',
      source: new TextEncoder().encode(TYPED_SOURCE),
    });

    expect(result.source).not.toContain(': number');
  });

  it('reads the file when the default loader returned no source', () => {
    const dir = mkdtempSync(join(tmpdir(), 'workspace-type-stripping-'));
    scratchDirs.push(dir);
    const packageDir = join(dir, 'node_modules', '@openthrottle', 'pkg');
    const file = join(packageDir, 'index.ts');

    mkdirSync(packageDir, { recursive: true });
    writeFileSync(file, TYPED_SOURCE);

    const result = stripWorkspaceTypes(pathToFileURL(file).href, {
      format: 'module-typescript',
      source: undefined,
    });

    expect(result.source).not.toContain(': number');
  });

  it('leaves workspace source outside node_modules to Node, as in development', () => {
    const loaded = { format: 'module-typescript', source: TYPED_SOURCE };

    expect(
      stripWorkspaceTypes(
        'file:///repo/packages/nodejs-utils/src/index.ts',
        loaded,
      ),
    ).toBe(loaded);
  });

  it('leaves third-party TypeScript under node_modules alone', () => {
    const loaded = { format: 'module-typescript', source: TYPED_SOURCE };

    expect(
      stripWorkspaceTypes('file:///app/node_modules/some-lib/index.ts', loaded),
    ).toBe(loaded);
  });

  it('passes JavaScript through untouched', () => {
    const loaded = { format: 'module', source: 'export {};' };

    expect(
      stripWorkspaceTypes(WORKSPACE_URL.replace(/\.ts$/, '.js'), loaded),
    ).toBe(loaded);
  });
});

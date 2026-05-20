// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  findMonorepoRootFromPath,
  getMonorepoRoot,
  isMonorepoRootDirectory,
} from '~/routing/agents/data/resolve-monorepo-root.server';

const tempDirs: string[] = [];

const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ot-monorepo-root-'));
  tempDirs.push(dir);
  return dir;
};

const writeMonorepoMarkers = (root: string): void => {
  writeFileSync(join(root, 'nx.json'), '{}');
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - "*"\n');
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { force: true, recursive: true });
    }
  }
  vi.unstubAllEnvs();
});

describe('isMonorepoRootDirectory', () => {
  test('requires nx.json and pnpm-workspace.yaml on disk', () => {
    const root = makeTempDir();
    writeMonorepoMarkers(root);
    expect(isMonorepoRootDirectory(root)).toBe(true);
  });

  test('returns false when a marker is missing', () => {
    const root = makeTempDir();
    writeFileSync(join(root, 'nx.json'), '{}');
    expect(isMonorepoRootDirectory(root)).toBe(false);
  });
});

describe('findMonorepoRootFromPath', () => {
  test('returns null when no markers exist', () => {
    const start = makeTempDir();
    expect(findMonorepoRootFromPath(start)).toBeNull();
  });

  test('finds root when cwd is nested under the monorepo', () => {
    const root = makeTempDir();
    writeMonorepoMarkers(root);
    const nested = join(root, 'applications', 'openthrottle-developer');
    mkdirSync(nested, { recursive: true });

    expect(findMonorepoRootFromPath(nested)).toBe(root);
  });

  test('returns root when startDir is the monorepo root', () => {
    const root = makeTempDir();
    writeMonorepoMarkers(root);
    expect(findMonorepoRootFromPath(root)).toBe(root);
  });
});

describe('getMonorepoRoot', () => {
  test('prefers WORKSPACE_ROOT when set to an existing directory', () => {
    const root = makeTempDir();
    writeMonorepoMarkers(root);
    const other = makeTempDir();
    vi.stubEnv('WORKSPACE_ROOT', other);

    expect(getMonorepoRoot()).toBe(other);
  });

  test('walks up from process.cwd when WORKSPACE_ROOT is unset', () => {
    const root = makeTempDir();
    writeMonorepoMarkers(root);
    const nested = join(root, 'applications', 'openthrottle-developer');
    mkdirSync(nested, { recursive: true });
    vi.stubEnv('WORKSPACE_ROOT', '');
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(nested);

    expect(getMonorepoRoot()).toBe(root);

    cwdSpy.mockRestore();
  });

  test('ignores invalid WORKSPACE_ROOT and falls back to walk-up', () => {
    const root = makeTempDir();
    writeMonorepoMarkers(root);
    vi.stubEnv('WORKSPACE_ROOT', join(root, 'does-not-exist'));
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(root);

    expect(getMonorepoRoot()).toBe(root);

    cwdSpy.mockRestore();
  });
});

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ResolvedWorkspaceConfig } from '../../config/workspace-config.js';
import { runRipgrep, workspaceRipgrepArgs } from '../ripgrep.js';

const resolved = (
  overrides: Partial<ResolvedWorkspaceConfig> = {},
): ResolvedWorkspaceConfig => ({
  exclude: [],
  followSymlinks: false,
  respectGitignore: true,
  root: '/tmp/does-not-matter',
  ...overrides,
});

describe('workspaceRipgrepArgs', () => {
  it('always surfaces hidden files', () => {
    expect(workspaceRipgrepArgs(resolved())).toContain('--hidden');
  });

  it('uses --no-require-git when respectGitignore is on', () => {
    const args = workspaceRipgrepArgs(resolved({ respectGitignore: true }));

    expect(args).toContain('--no-require-git');
    expect(args).not.toContain('--no-ignore');
  });

  it('uses --no-ignore when respectGitignore is off', () => {
    const args = workspaceRipgrepArgs(resolved({ respectGitignore: false }));

    expect(args).toContain('--no-ignore');
    expect(args).not.toContain('--no-require-git');
  });

  it('adds --follow only when followSymlinks is enabled', () => {
    expect(
      workspaceRipgrepArgs(resolved({ followSymlinks: false })),
    ).not.toContain('--follow');
    expect(workspaceRipgrepArgs(resolved({ followSymlinks: true }))).toContain(
      '--follow',
    );
  });

  it('builds a negated --glob argument pair for each exclude', () => {
    const args = workspaceRipgrepArgs(
      resolved({ exclude: ['dist', '**/__generated__'] }),
    );

    // Each exclude becomes a `--glob` flag followed by its negated pattern.
    const distFlag = args.indexOf('!dist');
    const generatedFlag = args.indexOf('!**/__generated__');

    expect(distFlag).toBeGreaterThan(0);
    expect(args[distFlag - 1]).toBe('--glob');
    expect(generatedFlag).toBeGreaterThan(0);
    expect(args[generatedFlag - 1]).toBe('--glob');
  });
});

describe('runRipgrep', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-rg-'));
    await writeFile(join(root, 'a.txt'), 'needle here\n');
    await writeFile(join(root, 'b.txt'), 'nothing relevant\n');
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('returns matching stdout when ripgrep finds results', async () => {
    const { stdout } = await runRipgrep(
      ['--no-require-git', '--files'],
      resolved({ root }),
    );

    expect(stdout).toContain('a.txt');
    expect(stdout).toContain('b.txt');
  });

  it('treats exit code 1 (no matches) as an empty result, not an error', async () => {
    // A literal search with no hits makes ripgrep exit 1; runRipgrep must
    // swallow that into an empty stdout rather than rejecting.
    const { stdout } = await runRipgrep(
      ['--no-require-git', 'this-string-appears-in-no-file', '.'],
      resolved({ root }),
    );

    expect(stdout).toBe('');
  });

  it('re-throws genuine ripgrep failures (a non-1 exit code)', async () => {
    // `--not-a-real-flag` makes ripgrep exit with code 2 (usage error), which
    // is not the no-matches sentinel and must surface to the caller.
    await expect(
      runRipgrep(['--not-a-real-flag'], resolved({ root })),
    ).rejects.toThrow();
  });
});

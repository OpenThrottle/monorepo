/**
 * @description Guards the one value that has to be identical in three places: the code default, the
 * shell ladder's default, and the entry shipped in `.env.default`. They are read by different
 * runtimes and cannot import from each other, so nothing but a test stops them drifting — and a
 * drift here means the CLI and the server quietly create worktrees in different directories.
 *
 * Deliberately in its own file: the sibling resolver test mocks `node:fs`, which would also
 * intercept the real reads below.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DEFAULT_WORKTREE_ROOT_RELATIVE_PATH } from './worktree-root.resolver';

const REPO_ROOT = join(__dirname, '../../../../..');

const read = (relativePath: string): string =>
  readFileSync(join(REPO_ROOT, relativePath), 'utf-8');

describe('the default worktree root', () => {
  it('matches the value shipped in .env.default, exactly', () => {
    // Exact, including no trailing slash. The ladder strips one at runtime so a stray slash is
    // harmless in behavior, but the shipped default is the thing people copy — it should read the
    // same everywhere it appears. Tolerating the difference here is how the two drift apart.
    const documented = /^#?\s*OPENTHROTTLE_WORKTREE_ROOT="([^"]+)"/m.exec(
      read('.env.default'),
    )?.[1];

    expect(documented).toBe(`~/${DEFAULT_WORKTREE_ROOT_RELATIVE_PATH}`);
  });

  it("matches the shell ladder's default in root.sh", () => {
    // The script sets the ROOT here; the <org>/<repo> namespace is appended separately, by both
    // implementations, so it is not part of this constant.
    expect(read('skills/ot-worktree/scripts/root.sh')).toContain(
      `_root="$HOME/${DEFAULT_WORKTREE_ROOT_RELATIVE_PATH}"`,
    );
  });
});

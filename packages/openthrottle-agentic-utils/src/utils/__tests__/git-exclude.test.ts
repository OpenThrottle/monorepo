/**
 * @description Unit tests for the per-owner managed exclude blocks.
 *
 * The clobber case is the reason this is parameterized at all: more than one OT feature writes into
 * the same foreign repo, and each write replaces that owner's block wholesale. With a single shared
 * marker the last writer silently deleted the other's block — which for foreign-skill injection
 * would make every injected skill visible again and regress OT plan b409da6e.
 *
 * See OT plan 5a1ac8d1.
 */

import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  GIT_EXCLUDE_BEGIN_MARKER,
  GIT_EXCLUDE_END_MARKER,
  GIT_EXCLUDE_OWNER,
  removeManagedExcludeBlock,
  resolveGitExcludePath,
  writeManagedExcludeBlock,
} from '../foreign-skill-injection/index.ts';

const SKILLS = GIT_EXCLUDE_OWNER.FOREIGN_SKILL_INJECTION;
const EDITORS = GIT_EXCLUDE_OWNER.WORKSPACE_EDITORS;

describe('managed exclude blocks — per owner', () => {
  let base: string;
  let repo: string;

  const excludeContents = (): string =>
    readFileSync(resolveGitExcludePath(repo) ?? '', 'utf8');

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ot-git-exclude-'));
    repo = join(base, 'repo');
    mkdirSync(repo, { recursive: true });
    execFileSync('git', ['-C', repo, 'init', '-q'], { encoding: 'utf8' });
  });

  afterEach(() => {
    rmSync(base, { force: true, recursive: true });
  });

  it("keeps foreign-skill-injection's marker text byte-identical to what shipped", () => {
    // Exclude files already on disk carry these exact strings. Changing them orphans every existing
    // block, so this is pinned rather than left to the template.
    writeManagedExcludeBlock(repo, ['.agents/skills/ot-plans'], SKILLS);

    expect(excludeContents()).toContain(GIT_EXCLUDE_BEGIN_MARKER);
    expect(excludeContents()).toContain(GIT_EXCLUDE_END_MARKER);
  });

  it.each([
    ['skills first', [SKILLS, EDITORS]],
    ['editors first', [EDITORS, SKILLS]],
  ])('holds both owners without clobbering (%s)', (_label, order) => {
    const paths: Record<string, string[]> = {
      [EDITORS]: ['.openthrottle/workspace-editors.json'],
      [SKILLS]: ['.agents/skills/ot-plans'],
    };
    for (const owner of order) {
      writeManagedExcludeBlock(repo, paths[owner], owner);
    }

    const contents = excludeContents();
    expect(contents).toContain('/.agents/skills/ot-plans');
    expect(contents).toContain('/.openthrottle/workspace-editors.json');
    expect(contents).toContain(
      `# BEGIN OpenThrottle ${SKILLS} (managed — do not edit)`,
    );
    expect(contents).toContain(
      `# BEGIN OpenThrottle ${EDITORS} (managed — do not edit)`,
    );
  });

  it("rewriting one owner leaves the other's block byte-identical", () => {
    writeManagedExcludeBlock(
      repo,
      ['.openthrottle/workspace-editors.json'],
      EDITORS,
    );
    const editorsBlock = excludeContents();

    writeManagedExcludeBlock(repo, ['.agents/skills/ot-plans'], SKILLS);
    writeManagedExcludeBlock(repo, ['.agents/skills/other'], SKILLS);

    // The editors block survives both writes, unchanged, including its own path line.
    expect(excludeContents()).toContain(
      editorsBlock.trim().split('\n').slice(-3).join('\n'),
    );
    expect(excludeContents()).toContain(
      '/.openthrottle/workspace-editors.json',
    );
    // ...and the rewritten skills block replaced itself rather than accumulating.
    expect(excludeContents()).not.toContain('/.agents/skills/ot-plans');
    expect(excludeContents()).toContain('/.agents/skills/other');
  });

  it('removes only the named owner, leaving the other intact', () => {
    writeManagedExcludeBlock(repo, ['.agents/skills/ot-plans'], SKILLS);
    writeManagedExcludeBlock(
      repo,
      ['.openthrottle/workspace-editors.json'],
      EDITORS,
    );

    removeManagedExcludeBlock(repo, SKILLS);

    const contents = excludeContents();
    expect(contents).not.toContain('/.agents/skills/ot-plans');
    expect(contents).not.toContain(`# BEGIN OpenThrottle ${SKILLS}`);
    expect(contents).toContain('/.openthrottle/workspace-editors.json');
    expect(contents).toContain(`# BEGIN OpenThrottle ${EDITORS}`);
  });

  it('preserves user-owned lines around both blocks', () => {
    const excludePath = resolveGitExcludePath(repo) ?? '';
    writeFileSync(excludePath, '# my own notes\n*.local\n', 'utf8');

    writeManagedExcludeBlock(repo, ['.agents/skills/ot-plans'], SKILLS);
    writeManagedExcludeBlock(
      repo,
      ['.openthrottle/workspace-editors.json'],
      EDITORS,
    );
    removeManagedExcludeBlock(repo, SKILLS);
    removeManagedExcludeBlock(repo, EDITORS);

    expect(excludeContents()).toBe('# my own notes\n*.local\n');
  });

  it('is idempotent per owner', () => {
    writeManagedExcludeBlock(
      repo,
      ['.openthrottle/workspace-editors.json'],
      EDITORS,
    );
    const once = excludeContents();
    writeManagedExcludeBlock(
      repo,
      ['.openthrottle/workspace-editors.json'],
      EDITORS,
    );

    expect(excludeContents()).toBe(once);
  });

  it('returns false for a non-git path instead of throwing', () => {
    expect(
      writeManagedExcludeBlock(
        base,
        ['.openthrottle/workspace-editors.json'],
        EDITORS,
      ),
    ).toBe(false);
  });
});

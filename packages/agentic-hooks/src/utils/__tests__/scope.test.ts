/**
 * Unit tests for scope detection (`utils/scope`). Split out of the original
 * package-wide `lib.test.ts` so each source module owns its own spec.
 *
 * The personal cases build a real directory tree with real symlinks rather than
 * mocking `fs`, because the behaviour under test is specifically about symlink
 * resolution: a personal skill reaches the agent as a link under `.agents/skills`
 * pointing at a root outside the repo, and a mocked `fs` would let a naive
 * path-prefix implementation pass.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { detectScope } from '../../index.ts';

describe('detectScope', () => {
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-scope-'));
    fs.mkdirSync(path.join(tmpRoot, 'skills', 'ot-plans'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'skills-lock.json'),
      JSON.stringify({
        skills: { 'nx-workspace': { source: 'nrwl/nx' } },
        version: 1,
      }),
    );
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it('labels skills/ directory as ours', () => {
    expect(detectScope('ot-plans', tmpRoot)).toBe('ours');
  });

  it('labels plugin-namespaced names as third-party', () => {
    expect(detectScope('vercel:deploy', tmpRoot)).toBe('third-party');
    expect(detectScope('engineering:code-review', tmpRoot)).toBe('third-party');
  });

  it('labels skills-lock installs as third-party', () => {
    expect(detectScope('nx-workspace', tmpRoot)).toBe('third-party');
  });

  it('labels unknown names as third-party', () => {
    expect(detectScope('totally-unknown-skill', tmpRoot)).toBe('third-party');
  });
});

describe('detectScope — the personal tier', () => {
  let fixtureRoot: string;
  let repoRoot: string;
  let personalRoot: string;

  /** The env a hook would see with the personal root pointed at our fixture. */
  const env = (): NodeJS.ProcessEnv => {
    return {
      OPENTHROTTLE_PERSONAL_SKILLS_DIR: personalRoot,
    };
  };

  /** Reproduce what ot-skill-sync writes: a link under `.agents/skills`. */
  const link = (name: string, target: string) => {
    const dir = path.join(repoRoot, '.agents', 'skills');
    fs.mkdirSync(dir, { recursive: true });
    fs.symlinkSync(target, path.join(dir, name));
  };

  const personalSkill = (name: string): string => {
    const dir = path.join(personalRoot, name);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  };

  beforeAll(() => {
    fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'skill-usage-personal-'),
    );
  });

  afterAll(() => {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  });

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(fixtureRoot, 'repo-'));
    personalRoot = fs.mkdtempSync(path.join(fixtureRoot, 'personal-'));
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { force: true, recursive: true });
    fs.rmSync(personalRoot, { force: true, recursive: true });
  });

  it('labels a skill linked from the resolved personal root as personal', () => {
    link('ot-beta-loop', personalSkill('ot-beta-loop'));

    expect(detectScope('ot-beta-loop', repoRoot, env())).toBe('personal');
  });

  it('still labels an in-repo skill as ours when it is also linked', () => {
    const authored = path.join(repoRoot, 'skills', 'ot-plans');
    fs.mkdirSync(authored, { recursive: true });
    link('ot-plans', authored);

    expect(detectScope('ot-plans', repoRoot, env())).toBe('ours');
  });

  it('labels a link that escapes the repo but misses the personal root as third-party', () => {
    const elsewhere = path.join(fixtureRoot, 'somewhere-else', 'rogue');
    fs.mkdirSync(elsewhere, { recursive: true });
    link('rogue', elsewhere);

    expect(detectScope('rogue', repoRoot, env())).toBe('third-party');
  });

  it('labels a dangling link into the personal root as third-party', () => {
    link('deleted', path.join(personalRoot, 'deleted'));

    expect(detectScope('deleted', repoRoot, env())).toBe('third-party');
  });

  it('labels a plugin-namespaced name as third-party without probing the link dir', () => {
    link('vercel', personalSkill('vercel'));

    expect(detectScope('vercel:deploy', repoRoot, env())).toBe('third-party');
  });

  it('degrades to the two-way answer when the personal root does not exist', () => {
    link('draft-skill', personalSkill('draft-skill'));

    expect(
      detectScope('draft-skill', repoRoot, {
        OPENTHROTTLE_PERSONAL_SKILLS_DIR: path.join(
          fixtureRoot,
          'no-such-root',
        ),
      }),
    ).toBe('third-party');
  });

  it('falls back to the default root, without throwing, when the override is unset or blank', () => {
    link('draft-skill', personalSkill('draft-skill'));

    // The fixture root is not `~/.openthrottle/skills`, so both degrade to
    // third-party; what matters is that neither throws out of the hook.
    expect(detectScope('draft-skill', repoRoot, {})).toBe('third-party');
    expect(
      detectScope('draft-skill', repoRoot, {
        OPENTHROTTLE_PERSONAL_SKILLS_DIR: '   ',
      }),
    ).toBe('third-party');
  });

  it('labels an empty skill name as third-party', () => {
    expect(detectScope('', repoRoot, env())).toBe('third-party');
  });
});

describe('detectScope — the injected tier', () => {
  let fixtureRoot: string;
  let foreignRepo: string;
  let sourceRepo: string;

  /** Reproduce what foreign skill injection writes into the foreign repo. */
  const link = (name: string, target: string) => {
    const dir = path.join(foreignRepo, '.agents', 'skills');
    fs.mkdirSync(dir, { recursive: true });
    fs.symlinkSync(target, path.join(dir, name));
  };

  const authoredIn = (repo: string, name: string): string => {
    const dir = path.join(repo, 'skills', name);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  };

  /** A personal root that matches nothing, so only the injected check can fire. */
  const env = (): NodeJS.ProcessEnv => {
    return {
      OPENTHROTTLE_PERSONAL_SKILLS_DIR: path.join(fixtureRoot, 'no-personal'),
    };
  };

  beforeEach(() => {
    fixtureRoot = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-injected-')),
    );
    foreignRepo = path.join(fixtureRoot, 'foreign');
    sourceRepo = path.join(fixtureRoot, 'source');
    fs.mkdirSync(path.join(foreignRepo, '.git'), { recursive: true });
    fs.mkdirSync(path.join(sourceRepo, '.git'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  });

  it("labels a link into another checkout's skills/<name> as injected", () => {
    link('ot-loop', authoredIn(sourceRepo, 'ot-loop'));

    expect(detectScope('ot-loop', foreignRepo, env())).toBe('injected');
  });

  it('labels a link into a directory that is not skills/<name> as third-party', () => {
    const notAuthored = path.join(sourceRepo, 'vendor', 'ot-loop');
    fs.mkdirSync(notAuthored, { recursive: true });
    link('ot-loop', notAuthored);

    expect(detectScope('ot-loop', foreignRepo, env())).toBe('third-party');
  });

  it('labels a link whose name differs from the authored folder as third-party', () => {
    link('renamed', authoredIn(sourceRepo, 'ot-loop'));

    expect(detectScope('renamed', foreignRepo, env())).toBe('third-party');
  });

  it('labels a link into skills/ outside any checkout as third-party', () => {
    const loose = path.join(fixtureRoot, 'loose');
    link('ot-loop', authoredIn(loose, 'ot-loop'));

    expect(detectScope('ot-loop', foreignRepo, env())).toBe('third-party');
  });

  it('labels a dangling injected link as third-party', () => {
    link('gone', path.join(sourceRepo, 'skills', 'gone'));

    expect(detectScope('gone', foreignRepo, env())).toBe('third-party');
  });

  it('prefers ours when the skill is also authored in this repo', () => {
    authoredIn(foreignRepo, 'ot-loop');
    link('ot-loop', authoredIn(sourceRepo, 'ot-loop'));

    expect(detectScope('ot-loop', foreignRepo, env())).toBe('ours');
  });
});

describe('detectScope — a ledgered copy (container-mode injection)', () => {
  let fixtureRoot: string;
  let foreignRepo: string;
  let ledgerDir: string;
  let personalRoot: string;

  const env = (): NodeJS.ProcessEnv => {
    return {
      OPENTHROTTLE_FOREIGN_SKILL_LEDGER_DIR: ledgerDir,
      OPENTHROTTLE_PERSONAL_SKILLS_DIR: personalRoot,
    };
  };

  /** Reproduce what copy-mode injection writes: a real directory carrying a SKILL.md. */
  const copyInto = (name: string, body: string): string => {
    const relativePath = path.join('.agents', 'skills', name);
    const dir = path.join(foreignRepo, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), body);
    return relativePath;
  };

  const fingerprint = (body: string): string => {
    return createHash('sha256').update(body, 'utf8').digest('hex');
  };

  const writeLedger = (file: string, entries: readonly unknown[]) => {
    fs.mkdirSync(ledgerDir, { recursive: true });
    fs.writeFileSync(
      path.join(ledgerDir, file),
      JSON.stringify({
        createdDirs: [],
        entries,
        // The host path: deliberately NOT the path the hook sees.
        repoPath: '/host/workspaces/foreign',
        updatedAt: '2026-11-15T00:00:00.000Z',
      }),
    );
  };

  const copyEntry = (
    name: string,
    body: string,
    injectedRelativePath: string,
    sourcePath = `/srv/openthrottle/skills/${name}`,
  ) => {
    return {
      fingerprint: fingerprint(body),
      injectedRelativePath,
      mode: 'copy',
      name,
      sourcePath,
    };
  };

  beforeEach(() => {
    fixtureRoot = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'skill-usage-ledgered-')),
    );
    foreignRepo = path.join(fixtureRoot, 'foreign');
    ledgerDir = path.join(fixtureRoot, 'ledgers');
    personalRoot = path.join(fixtureRoot, 'personal');
    fs.mkdirSync(path.join(foreignRepo, '.git'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  });

  it('labels a copy whose SKILL.md matches a ledgered fingerprint as injected', () => {
    const body = '# ot-plans\n';
    const relativePath = copyInto('ot-plans', body);
    writeLedger('a.json', [copyEntry('ot-plans', body, relativePath)]);

    expect(detectScope('ot-plans', foreignRepo, env())).toBe('injected');
  });

  it('finds the entry in the worktree-overlay ledger too', () => {
    const body = '# ot-worktree\n';
    const relativePath = copyInto('ot-worktree', body);
    writeLedger('a.json', []);
    writeLedger('a.worktree-overlay.json', [
      copyEntry('ot-worktree', body, relativePath),
    ]);

    expect(detectScope('ot-worktree', foreignRepo, env())).toBe('injected');
  });

  it('labels a ledgered copy of a personal skill as personal', () => {
    const body = '# draft\n';
    const relativePath = copyInto('draft', body);
    writeLedger('a.json', [
      copyEntry('draft', body, relativePath, path.join(personalRoot, 'draft')),
    ]);

    expect(detectScope('draft', foreignRepo, env())).toBe('personal');
  });

  it('labels a copy the user has since edited as third-party', () => {
    const relativePath = copyInto('ot-plans', '# edited by the user\n');
    writeLedger('a.json', [
      copyEntry('ot-plans', '# ot-plans\n', relativePath),
    ]);

    expect(detectScope('ot-plans', foreignRepo, env())).toBe('third-party');
  });

  it('ignores a ledger entry recorded for a different skill name', () => {
    const body = '# ot-plans\n';
    const relativePath = copyInto('ot-plans', body);
    writeLedger('a.json', [copyEntry('ot-stack', body, relativePath)]);

    expect(detectScope('ot-plans', foreignRepo, env())).toBe('third-party');
  });

  it('ignores a symlink-mode entry, which the link check already owns', () => {
    const body = '# ot-plans\n';
    const relativePath = copyInto('ot-plans', body);
    writeLedger('a.json', [
      { ...copyEntry('ot-plans', body, relativePath), mode: 'symlink' },
    ]);

    expect(detectScope('ot-plans', foreignRepo, env())).toBe('third-party');
  });

  it('refuses a ledgered path that escapes the repo', () => {
    const body = '# ot-plans\n';
    const outside = path.join(fixtureRoot, 'outside', 'ot-plans');
    fs.mkdirSync(outside, { recursive: true });
    fs.writeFileSync(path.join(outside, 'SKILL.md'), body);
    writeLedger('a.json', [
      copyEntry('ot-plans', body, path.join('..', 'outside', 'ot-plans')),
    ]);

    expect(detectScope('ot-plans', foreignRepo, env())).toBe('third-party');
  });

  it('fails open on a malformed ledger and on a missing ledger dir', () => {
    copyInto('ot-plans', '# ot-plans\n');
    fs.mkdirSync(ledgerDir, { recursive: true });
    fs.writeFileSync(path.join(ledgerDir, 'broken.json'), '{ not json');

    expect(detectScope('ot-plans', foreignRepo, env())).toBe('third-party');
    expect(
      detectScope('ot-plans', foreignRepo, {
        OPENTHROTTLE_FOREIGN_SKILL_LEDGER_DIR: path.join(fixtureRoot, 'none'),
      }),
    ).toBe('third-party');
  });
});

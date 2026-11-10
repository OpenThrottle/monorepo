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

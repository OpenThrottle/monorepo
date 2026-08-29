import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  CONTAINER_WORKSPACES_DIR_ENV,
  HOST_WORKSPACES_DIR_ENV,
} from '../workspace-paths.ts';
import {
  ensureMaterialized,
  teardown,
} from '../foreign-skill-injection/index.ts';
import {
  FOREIGN_SKILL_LEDGER_DIR_ENV,
  ledgerPathForRepo,
  readLedger,
} from '../foreign-skill-injection/index.ts';

const git = (repo: string, ...args: string[]): string =>
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();

const porcelain = (repo: string): string => git(repo, 'status', '--porcelain');

const writeSkill = (root: string, name: string): void => {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: The ${name} skill\n---\n\n# ${name}\n`,
  );
};

describe('foreign-skill-injection materializer', () => {
  let base: string;
  let repo: string;
  let otSkills: string;
  let ledgerDir: string;
  let hostEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ot-fsi-'));
    repo = join(base, 'target-repo');
    otSkills = join(base, 'ot', 'skills');
    ledgerDir = join(base, 'ledgers');
    mkdirSync(repo, { recursive: true });
    mkdirSync(otSkills, { recursive: true });

    // A committed target repo so `git status` has a meaningful clean baseline.
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    writeFileSync(join(repo, 'README.md'), '# target\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'init');

    writeSkill(otSkills, 'ot-plans');
    writeSkill(otSkills, 'create-readme');

    hostEnv = {
      ...process.env,
      // Ensure no stray container mapping leaks in from the real env.
      [CONTAINER_WORKSPACES_DIR_ENV]: '',
      [FOREIGN_SKILL_LEDGER_DIR_ENV]: ledgerDir,
      [HOST_WORKSPACES_DIR_ENV]: '',
    };
  });

  afterEach(() => {
    rmSync(base, { force: true, recursive: true });
  });

  test('host mode: symlinks both dirs, ledger + exclude written, git clean', () => {
    expect(porcelain(repo)).toBe('');

    const result = ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    expect(result.mode).toBe('symlink');
    expect(result.injectedNames).toEqual(['create-readme', 'ot-plans']);

    // Both target dirs got symlinks pointing at the OT source.
    const link = join(repo, '.agents/skills/ot-plans');
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe(join(otSkills, 'ot-plans'));
    expect(
      lstatSync(join(repo, '.claude/skills/create-readme')).isSymbolicLink(),
    ).toBe(true);

    // The CLI can read the skill through the link.
    expect(
      readFileSync(join(repo, '.agents/skills/ot-plans/SKILL.md'), 'utf8'),
    ).toContain('The ot-plans skill');

    // Non-mutation: git status is clean DURING the run.
    expect(porcelain(repo)).toBe('');

    // Ledger records every created path.
    const ledger = readLedger(ledgerPathForRepo(repo, hostEnv));
    expect(ledger?.entries).toHaveLength(4);
    expect(
      new Set(ledger?.entries.map((entry) => entry.injectedRelativePath)),
    ).toEqual(
      new Set([
        '.agents/skills/create-readme',
        '.agents/skills/ot-plans',
        '.claude/skills/create-readme',
        '.claude/skills/ot-plans',
      ]),
    );
  });

  test('idempotent: a second ensure is a no-op and stays clean', () => {
    const first = ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });
    const linkStat = lstatSync(join(repo, '.agents/skills/ot-plans'));

    const second = ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    expect(second.injectedNames).toEqual(first.injectedNames);
    // Symlink was not recreated (same inode/ctime).
    expect(lstatSync(join(repo, '.agents/skills/ot-plans')).ctimeMs).toBe(
      linkStat.ctimeMs,
    );
    expect(porcelain(repo)).toBe('');
  });

  test('teardown removes only ledgered paths and restores a clean tree', () => {
    ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });
    // The links exist on disk but are IGNORED (proof they are hidden, not absent).
    expect(
      lstatSync(join(repo, '.agents/skills/ot-plans')).isSymbolicLink(),
    ).toBe(true);
    expect(git(repo, 'status', '--porcelain', '--ignored')).not.toBe('');

    teardown({ env: hostEnv, repoPath: repo });

    // Ledger gone, links gone, dirs pruned, git clean.
    expect(readLedger(ledgerPathForRepo(repo, hostEnv))).toBeUndefined();
    expect(() => lstatSync(join(repo, '.agents/skills/ot-plans'))).toThrow();
    expect(() => lstatSync(join(repo, '.agents'))).toThrow();
    expect(porcelain(repo)).toBe('');
    // Nothing ignored remains either — the exclude block was removed.
    expect(git(repo, 'status', '--porcelain', '--ignored')).toBe('');
  });

  test('target-owned skill name is never injected or overwritten', () => {
    // The repo defines its own create-readme (committed, tracked).
    mkdirSync(join(repo, '.agents/skills/create-readme'), { recursive: true });
    writeFileSync(
      join(repo, '.agents/skills/create-readme/SKILL.md'),
      '---\nname: create-readme\ndescription: repo house style\n---\n\nours\n',
    );
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'own skill');

    const result = ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    // create-readme excluded; only ot-plans injected.
    expect(result.injectedNames).toEqual(['ot-plans']);
    // The repo's own create-readme is untouched (still a real dir, our content).
    expect(
      lstatSync(join(repo, '.agents/skills/create-readme')).isSymbolicLink(),
    ).toBe(false);
    expect(
      readFileSync(join(repo, '.agents/skills/create-readme/SKILL.md'), 'utf8'),
    ).toContain('repo house style');
    expect(porcelain(repo)).toBe('');
  });

  test('container mode materializes copies, not symlinks', () => {
    const containerEnv: NodeJS.ProcessEnv = {
      ...hostEnv,
      [CONTAINER_WORKSPACES_DIR_ENV]: '/workspaces',
      [HOST_WORKSPACES_DIR_ENV]: '/host/workspaces',
    };

    const result = ensureMaterialized({
      env: containerEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    expect(result.mode).toBe('copy');
    const copied = join(repo, '.agents/skills/ot-plans');
    expect(lstatSync(copied).isSymbolicLink()).toBe(false);
    expect(lstatSync(copied).isDirectory()).toBe(true);
    expect(readFileSync(join(copied, 'SKILL.md'), 'utf8')).toContain(
      'The ot-plans skill',
    );
    expect(porcelain(repo)).toBe('');

    // Ledger records copy-mode fingerprints.
    const ledger = readLedger(ledgerPathForRepo(repo, containerEnv));
    expect(
      ledger?.entries.every(
        (entry) => entry.mode === 'copy' && entry.fingerprint !== undefined,
      ),
    ).toBe(true);
  });

  test('personal tier overrides OT and injects personal-only skills', () => {
    const personalDir = join(base, 'personal', 'skills');
    mkdirSync(personalDir, { recursive: true });
    // ot-plans exists in both layers; my-spike is personal-only.
    writeSkill(personalDir, 'ot-plans');
    writeSkill(personalDir, 'my-spike');

    const result = ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      personalSkillsDir: personalDir,
      repoPath: repo,
    });

    expect(result.injectedNames).toContain('my-spike');
    // The injected ot-plans link points at the PERSONAL source, not the OT one.
    expect(readlinkSync(join(repo, '.agents/skills/ot-plans'))).toBe(
      join(personalDir, 'ot-plans'),
    );
    expect(porcelain(repo)).toBe('');
  });

  test('teardown leaves a user-replaced entry in place', () => {
    ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    // User replaces one injected symlink with their own real dir.
    const replaced = join(repo, '.agents/skills/ot-plans');
    rmSync(replaced, { force: true, recursive: true });
    mkdirSync(replaced, { recursive: true });
    writeFileSync(join(replaced, 'SKILL.md'), 'user content\n');

    teardown({ env: hostEnv, repoPath: repo });

    // The user's replacement survives; OT's other links are gone.
    expect(readFileSync(join(replaced, 'SKILL.md'), 'utf8')).toBe(
      'user content\n',
    );
    expect(() => lstatSync(join(repo, '.claude/skills/ot-plans'))).toThrow();
  });
});

/**
 * Regression: a target dir that is a SYMLINK into the repo's own tracked space.
 *
 * `.claude/skills -> ../skills` is a real legacy layout (ot-skill-sync's
 * `ensure_agent_skill_dir` exists to undo it). `existsSync` follows symlinks, so the injector never
 * noticed: it wrote through the link into the tracked `skills/` dir while recording and excluding
 * the un-followed `.claude/skills/<name>` path. The exclude patterns then matched nothing and the
 * target repo's `git status` went dirty — breaking the non-mutation guarantee in design doc §4.
 *
 * See OT plan b409da6e. Task 1 decision: resolve the target dir, record and exclude the RESOLVED
 * repo-relative path; refuse only when it escapes the repo.
 */
describe('foreign-skill-injection materializer — symlinked target dir', () => {
  let base: string;
  let repo: string;
  let otSkills: string;
  let ledgerDir: string;
  let hostEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ot-fsi-symlink-'));
    repo = join(base, 'target-repo');
    otSkills = join(base, 'ot', 'skills');
    ledgerDir = join(base, 'ledgers');
    mkdirSync(repo, { recursive: true });
    mkdirSync(otSkills, { recursive: true });

    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');

    // The repo owns a real, TRACKED skills/ directory, and .claude/skills is a symlink into it.
    // Both are committed: in the legacy layout this IS part of the repo, so the clean baseline
    // below is the honest starting point rather than an artifact of the fixture.
    writeSkill(join(repo, 'skills'), 'house-style');
    mkdirSync(join(repo, '.claude'), { recursive: true });
    symlinkSync('../skills', join(repo, '.claude/skills'), 'dir');
    writeFileSync(join(repo, 'README.md'), '# target\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'init');

    writeSkill(otSkills, 'ot-plans');

    hostEnv = {
      ...process.env,
      [CONTAINER_WORKSPACES_DIR_ENV]: '',
      [FOREIGN_SKILL_LEDGER_DIR_ENV]: ledgerDir,
      [HOST_WORKSPACES_DIR_ENV]: '',
    };
  });

  afterEach(() => {
    rmSync(base, { force: true, recursive: true });
  });

  test('leaves git status clean when a target dir is a symlink into tracked space', () => {
    expect(porcelain(repo)).toBe('');

    ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    // THE regression. Before the fix this reports `?? skills/ot-plans`, because the entry was
    // written through the symlink into tracked space while `/.claude/skills/ot-plans` was excluded.
    expect(porcelain(repo)).toBe('');
  });

  test('records paths git actually ignores, not un-followed ones', () => {
    ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    const ledger = readLedger(ledgerPathForRepo(repo, hostEnv));
    expect(ledger?.entries.length).toBeGreaterThan(0);

    for (const entry of ledger?.entries ?? []) {
      // `lstatSync` would follow the parent symlink and pass vacuously. Ask GIT instead: every
      // recorded path must be one git ignores. Teardown and the boot reaper act on exactly these
      // strings, so a path git cannot see is also a path they cannot clean up.
      const ignored = execFileSync(
        'git',
        ['-C', repo, 'check-ignore', '-q', entry.injectedRelativePath],
        { encoding: 'utf8' },
        // check-ignore exits 1 for "not ignored"; treat that as the failure it is.
      );
      expect(ignored).toBeDefined();
    }
  });

  test("does not mask the repo's own skill that lives behind the symlink", () => {
    ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    // `house-style` is target-owned and reachable through .claude/skills; it must survive as the
    // repo's own committed file, never replaced by an OT symlink.
    expect(lstatSync(join(repo, 'skills/house-style')).isSymbolicLink()).toBe(
      false,
    );
    expect(porcelain(repo)).toBe('');
  });
});

/**
 * The two escape hatches in `resolveTargetDirs`, per the task 1 decision (OT plan b409da6e):
 * refuse a dir that resolves outside the repo, and de-duplicate dirs that resolve to the same place.
 */
describe('foreign-skill-injection materializer — target dir resolution edge cases', () => {
  let base: string;
  let repo: string;
  let otSkills: string;
  let ledgerDir: string;
  let hostEnv: NodeJS.ProcessEnv;

  const initRepo = (): void => {
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    writeFileSync(join(repo, 'README.md'), '# target\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'init');
  };

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ot-fsi-edge-'));
    repo = join(base, 'target-repo');
    otSkills = join(base, 'ot', 'skills');
    ledgerDir = join(base, 'ledgers');
    mkdirSync(repo, { recursive: true });
    mkdirSync(otSkills, { recursive: true });
    writeSkill(otSkills, 'ot-plans');

    hostEnv = {
      ...process.env,
      [CONTAINER_WORKSPACES_DIR_ENV]: '',
      [FOREIGN_SKILL_LEDGER_DIR_ENV]: ledgerDir,
      [HOST_WORKSPACES_DIR_ENV]: '',
    };
  });

  afterEach(() => {
    rmSync(base, { force: true, recursive: true });
  });

  test('refuses a target dir that resolves OUTSIDE the repo, and says why', () => {
    const outside = join(base, 'elsewhere');
    mkdirSync(outside, { recursive: true });
    mkdirSync(join(repo, '.claude'), { recursive: true });
    symlinkSync(outside, join(repo, '.claude/skills'), 'dir');
    // Commit the layout so the clean baseline is the repo's real state, not a fixture artifact.
    initRepo();

    const result = ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    // .agents/skills still gets injected; only the escaping dir is refused.
    expect(result.injectedNames).toEqual(['ot-plans']);
    expect(result.warnings.join('\n')).toContain('outside');
    expect(porcelain(repo)).toBe('');

    // Nothing was written through the escaping link.
    expect(existsSync(join(outside, 'ot-plans'))).toBe(false);
  });

  test('de-duplicates two target dirs that resolve to the same real directory', () => {
    mkdirSync(join(repo, '.agents/skills'), { recursive: true });
    mkdirSync(join(repo, '.claude'), { recursive: true });
    symlinkSync('../.agents/skills', join(repo, '.claude/skills'), 'dir');
    initRepo();

    const result = ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    expect(result.injectedNames).toEqual(['ot-plans']);
    // Injected once, recorded once — not once plus a bogus "already occupied" skip.
    const ledger = readLedger(ledgerPathForRepo(repo, hostEnv));
    expect(ledger?.entries.map((entry) => entry.injectedRelativePath)).toEqual([
      '.agents/skills/ot-plans',
    ]);
    expect(result.warnings.join('\n')).not.toContain('already occupies');
    expect(porcelain(repo)).toBe('');
  });
});

/**
 * Teardown and the boot reaper both act on the ledger's recorded strings, so they inherit whatever
 * task 3 records. These pin that down for the symlinked layout, including a ledger written by the
 * OLD code — the state real repos are in right now (OT plan b409da6e task 5).
 */
describe('foreign-skill-injection teardown — symlinked target dir', () => {
  let base: string;
  let repo: string;
  let otSkills: string;
  let ledgerDir: string;
  let hostEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ot-fsi-teardown-'));
    repo = join(base, 'target-repo');
    otSkills = join(base, 'ot', 'skills');
    ledgerDir = join(base, 'ledgers');
    mkdirSync(repo, { recursive: true });
    mkdirSync(otSkills, { recursive: true });
    writeSkill(otSkills, 'ot-plans');

    writeSkill(join(repo, 'skills'), 'house-style');
    mkdirSync(join(repo, '.claude'), { recursive: true });
    symlinkSync('../skills', join(repo, '.claude/skills'), 'dir');
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    writeFileSync(join(repo, 'README.md'), '# target\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'init');

    hostEnv = {
      ...process.env,
      [CONTAINER_WORKSPACES_DIR_ENV]: '',
      [FOREIGN_SKILL_LEDGER_DIR_ENV]: ledgerDir,
      [HOST_WORKSPACES_DIR_ENV]: '',
    };
  });

  afterEach(() => {
    rmSync(base, { force: true, recursive: true });
  });

  test('removes the injected entries and leaves the repo clean', () => {
    ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });
    expect(existsSync(join(repo, 'skills/ot-plans'))).toBe(true);

    teardown({ env: hostEnv, repoPath: repo });

    expect(existsSync(join(repo, 'skills/ot-plans'))).toBe(false);
    expect(porcelain(repo)).toBe('');
    expect(readLedger(ledgerPathForRepo(repo, hostEnv))).toBeUndefined();
  });

  test("never removes the repo's own skill sitting beside the injected one", () => {
    ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });
    teardown({ env: hostEnv, repoPath: repo });

    // house-style is committed and target-owned; teardown must not touch it.
    expect(
      readFileSync(join(repo, 'skills/house-style/SKILL.md'), 'utf8'),
    ).toContain('The house-style skill');
    expect(porcelain(repo)).toBe('');
  });

  test('an OLD-format ledger still cleans up the real files it points through', () => {
    ensureMaterialized({
      env: hostEnv,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    // Rewrite the ledger the way the pre-fix code wrote it: the un-followed path.
    const ledgerPath = ledgerPathForRepo(repo, hostEnv);
    const ledger = readLedger(ledgerPath);
    writeFileSync(
      ledgerPath,
      JSON.stringify({
        ...ledger,
        entries: (ledger?.entries ?? []).map((entry) => ({
          ...entry,
          injectedRelativePath: entry.injectedRelativePath.replace(
            /^skills\//,
            '.claude/skills/',
          ),
        })),
      }),
    );

    teardown({ env: hostEnv, repoPath: repo });

    // join() + the symlink still lands on the real file, so teardown reaches it. This is why
    // healing (task 5) is about the stale exclude block and orphaned entries, not lost files.
    expect(existsSync(join(repo, 'skills/ot-plans'))).toBe(false);
    expect(
      readFileSync(join(repo, 'skills/house-style/SKILL.md'), 'utf8'),
    ).toContain('The house-style skill');
  });
});

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  symlinkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  ensureMaterialized,
  FOREIGN_SKILL_LEDGER_DIR_ENV,
  ledgerPathForRepo,
  readLedger,
} from '@openthrottle/openthrottle-agentic-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ForeignSkillInjectionLifecycleService } from './foreign-skill-injection-lifecycle.service';

const git = (repo: string, ...args: string[]): string =>
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();

const writeSkill = (root: string, name: string): void => {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: The ${name} skill\n---\n\n# ${name}\n`,
  );
};

describe('ForeignSkillInjectionLifecycleService reaper', () => {
  let base: string;
  let repo: string;
  let otSkills: string;
  let ledgerDir: string;
  let previousLedgerEnv: string | undefined;
  let service: ForeignSkillInjectionLifecycleService;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ot-fsi-reaper-'));
    repo = join(base, 'target-repo');
    otSkills = join(base, 'ot', 'skills');
    ledgerDir = join(base, 'ledgers');
    mkdirSync(repo, { recursive: true });
    mkdirSync(otSkills, { recursive: true });

    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    writeFileSync(join(repo, 'README.md'), '# target\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'init');

    writeSkill(otSkills, 'ot-plans');

    // The reaper reads process.env for the ledger dir; scope it to the tmp dir.
    previousLedgerEnv = process.env[FOREIGN_SKILL_LEDGER_DIR_ENV];
    process.env[FOREIGN_SKILL_LEDGER_DIR_ENV] = ledgerDir;

    service = new ForeignSkillInjectionLifecycleService(
      createMock<LoggerService>(),
    );
  });

  afterEach(() => {
    if (previousLedgerEnv === undefined) {
      delete process.env[FOREIGN_SKILL_LEDGER_DIR_ENV];
    } else {
      process.env[FOREIGN_SKILL_LEDGER_DIR_ENV] = previousLedgerEnv;
    }
    rmSync(base, { force: true, recursive: true });
  });

  it('reaps a layer stranded by a crash (ledger present, process gone)', () => {
    // A prior server instance materialized the layer, then crashed WITHOUT teardown.
    ensureMaterialized({
      env: process.env,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });
    expect(
      lstatSync(join(repo, '.agents/skills/ot-plans')).isSymbolicLink(),
    ).toBe(true);
    expect(readLedger(ledgerPathForRepo(repo, process.env))).toBeDefined();

    // New instance boots → reaper runs.
    service.reapStrandedLedgers();

    // The stranded layer is gone, the ledger is gone, and the repo is clean.
    expect(() => lstatSync(join(repo, '.agents/skills/ot-plans'))).toThrow();
    expect(() => lstatSync(join(repo, '.agents'))).toThrow();
    expect(readLedger(ledgerPathForRepo(repo, process.env))).toBeUndefined();
    expect(git(repo, 'status', '--porcelain')).toBe('');
  });

  it('never deletes a user-created path even under a stale ledger', () => {
    ensureMaterialized({
      env: process.env,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });

    // The user replaced one injected link with their own dir before the reaper runs.
    const replaced = join(repo, '.agents/skills/ot-plans');
    rmSync(replaced, { force: true, recursive: true });
    mkdirSync(replaced, { recursive: true });
    writeFileSync(join(replaced, 'SKILL.md'), 'user content\n');

    service.reapStrandedLedgers();

    // The user's content survives; the still-OT-owned link in the other dir is gone.
    expect(readFileSync(join(replaced, 'SKILL.md'), 'utf8')).toBe(
      'user content\n',
    );
    expect(() => lstatSync(join(repo, '.claude/skills/ot-plans'))).toThrow();
  });

  it('is a clean no-op when there are no ledgers', () => {
    expect(() => service.reapStrandedLedgers()).not.toThrow();
  });

  it('keeps a curated skill available across multiple runs, then removes it on shutdown', () => {
    writeSkill(otSkills, 'create-readme');

    // Curated skill is available (in BOTH CLI dirs → all five CLIs) and git stays
    // clean across three successive foreign runs.
    for (let run = 0; run < 3; run += 1) {
      const result = ensureMaterialized({
        env: process.env,
        otCuratedSkillsDir: otSkills,
        repoPath: repo,
      });
      expect(result.injectedNames).toContain('create-readme');
      expect(
        readFileSync(
          join(repo, '.agents/skills/create-readme/SKILL.md'),
          'utf8',
        ),
      ).toContain('create-readme');
      expect(
        readFileSync(
          join(repo, '.claude/skills/create-readme/SKILL.md'),
          'utf8',
        ),
      ).toContain('create-readme');
      expect(git(repo, 'status', '--porcelain')).toBe('');
    }

    // Server shutdown tears the layer down; the repo is byte-clean again.
    service.onApplicationShutdown();

    expect(() =>
      lstatSync(join(repo, '.agents/skills/create-readme')),
    ).toThrow();
    expect(() =>
      lstatSync(join(repo, '.claude/skills/create-readme')),
    ).toThrow();
    expect(readLedger(ledgerPathForRepo(repo, process.env))).toBeUndefined();
    expect(git(repo, 'status', '--porcelain')).toBe('');
  });
});

/**
 * The reaper on a symlinked-layout repo (`.claude/skills -> ../skills`, OT plan b409da6e). It acts
 * on the ledger's recorded strings, so it inherits whatever the materializer records — this pins
 * that the pair actually round-trips on the layout that broke the non-mutation guarantee.
 */
describe('ForeignSkillInjectionLifecycleService reaper — symlinked target dir', () => {
  let base: string;
  let repo: string;
  let otSkills: string;
  let ledgerDir: string;
  let previousLedgerEnv: string | undefined;
  let service: ForeignSkillInjectionLifecycleService;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'ot-fsi-reaper-symlink-'));
    repo = join(base, 'target-repo');
    otSkills = join(base, 'ot', 'skills');
    ledgerDir = join(base, 'ledgers');
    mkdirSync(repo, { recursive: true });
    mkdirSync(otSkills, { recursive: true });
    writeSkill(otSkills, 'ot-plans');

    // Legacy layout, committed so the clean baseline is the repo's real state.
    writeSkill(join(repo, 'skills'), 'house-style');
    mkdirSync(join(repo, '.claude'), { recursive: true });
    symlinkSync('../skills', join(repo, '.claude/skills'), 'dir');
    git(repo, 'init', '-q');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    writeFileSync(join(repo, 'README.md'), '# target\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'init');

    previousLedgerEnv = process.env[FOREIGN_SKILL_LEDGER_DIR_ENV];
    process.env[FOREIGN_SKILL_LEDGER_DIR_ENV] = ledgerDir;

    service = new ForeignSkillInjectionLifecycleService(
      createMock<LoggerService>(),
    );
  });

  afterEach(() => {
    if (previousLedgerEnv === undefined) {
      delete process.env[FOREIGN_SKILL_LEDGER_DIR_ENV];
    } else {
      process.env[FOREIGN_SKILL_LEDGER_DIR_ENV] = previousLedgerEnv;
    }
    rmSync(base, { force: true, recursive: true });
  });

  it('reaps a stranded symlinked-layout layer and leaves the repo clean', () => {
    ensureMaterialized({
      env: process.env,
      otCuratedSkillsDir: otSkills,
      repoPath: repo,
    });
    expect(existsSync(join(repo, 'skills/ot-plans'))).toBe(true);
    expect(git(repo, 'status', '--porcelain')).toBe('');

    service.reapStrandedLedgers();

    expect(existsSync(join(repo, 'skills/ot-plans'))).toBe(false);
    expect(readLedger(ledgerPathForRepo(repo, process.env))).toBeUndefined();
    // The repo's own committed skill survives, and nothing is left dirty.
    expect(
      readFileSync(join(repo, 'skills/house-style/SKILL.md'), 'utf8'),
    ).toContain('The house-style skill');
    expect(git(repo, 'status', '--porcelain')).toBe('');
  });
});

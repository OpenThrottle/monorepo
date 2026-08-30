import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ensureMaterialized,
  resolvePersonalSkillsDir,
  resolvePersonalSkillsRoot,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  parseSkillFrontmatterForValidation,
  skillFrontmatterSchema,
} from '@openthrottle/openthrottle-skills';

/**
 * Integration coverage for the personal (per-user) skills tier — the shell
 * pipeline in `skills/ot-skill-sync/scripts/` plus the Husky staging guard.
 *
 * Every case runs against a throwaway git repo and a throwaway personal root,
 * so nothing here depends on (or creates) a real `~/.openthrottle/skills`. That
 * matters twice over: CI has no personal root and must never grow one, and the
 * absent-root cases below are the assertion that it stays that way.
 *
 * See docs/monorepo/foreign-workspace-skill-injection.md §7.
 */

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const SCRIPTS_SRC = join(REPO_ROOT, 'skills', 'ot-skill-sync', 'scripts');
const GATE_SRC = join(REPO_ROOT, '.husky', 'lib', 'personal-skills-gate.sh');

interface Sandbox {
  readonly personalRoot: string;
  readonly repo: string;
}

const skillMarkdown = (name: string): string =>
  `---\nname: ${name}\ndescription: Fixture skill. USE WHEN exercising the personal tier.\n---\n\n# ${name}\n`;

const writeSkill = (root: string, name: string): void => {
  mkdirSync(join(root, name), { recursive: true });
  writeFileSync(join(root, name, 'SKILL.md'), skillMarkdown(name));
};

const git = (repo: string, ...args: readonly string[]): string =>
  execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });

interface RunResult {
  readonly output: string;
  readonly status: number;
}

/**
 * Shape execFileSync throws on a non-zero exit. A predicate rather than a cast:
 * the repo bans `as` assertions, and the failure genuinely is unknown until
 * narrowed.
 */
interface ExecFailure {
  readonly status?: number;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
}

const isExecFailure = (error: unknown): error is ExecFailure =>
  typeof error === 'object' && error !== null;

const runCommand = (
  command: string,
  args: readonly string[],
  cwd: string,
  personalRoot: string,
): RunResult => {
  try {
    return {
      output: execFileSync(command, [...args], {
        cwd,
        encoding: 'utf8',
        env: {
          ...process.env,
          OPENTHROTTLE_PERSONAL_SKILLS_DIR: personalRoot,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
      status: 0,
    };
  } catch (error) {
    if (!isExecFailure(error)) {
      throw error;
    }
    return {
      output: `${String(error.stdout ?? '')}${String(error.stderr ?? '')}`,
      status: error.status ?? 1,
    };
  }
};

const run = (
  sandbox: Sandbox,
  script: string,
  args: readonly string[],
): RunResult =>
  runCommand('bash', [script, ...args], sandbox.repo, sandbox.personalRoot);

const sync = (sandbox: Sandbox, args: readonly string[] = []): RunResult =>
  run(
    sandbox,
    join(sandbox.repo, 'skills', 'ot-skill-sync', 'scripts', 'sync.sh'),
    args,
  );

const cleanup = (sandbox: Sandbox): RunResult =>
  run(
    sandbox,
    join(sandbox.repo, 'skills', 'ot-skill-sync', 'scripts', 'cleanup.sh'),
    [],
  );

const personal = (sandbox: Sandbox, args: readonly string[]): RunResult =>
  run(
    sandbox,
    join(sandbox.repo, 'skills', 'ot-skill-sync', 'scripts', 'personal.sh'),
    args,
  );

/** Every place a skill is materialized: the universal dir plus each fan-out. */
const LINK_DIRS = [
  '.agents/skills',
  '.claude/skills',
  '.gemini/skills',
] as const;

describe('personal skills tier', () => {
  let sandbox: Sandbox;
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'ot-priv-skills-'));
    const repo = join(workspace, 'repo');
    const personalRoot = join(workspace, 'personal');
    mkdirSync(join(repo, 'skills'), { recursive: true });
    mkdirSync(personalRoot, { recursive: true });

    cpSync(SCRIPTS_SRC, join(repo, 'skills', 'ot-skill-sync', 'scripts'), {
      recursive: true,
    });
    mkdirSync(join(repo, '.husky', 'lib'), { recursive: true });
    cpSync(GATE_SRC, join(repo, '.husky', 'lib', 'personal-skills-gate.sh'));
    writeSkill(join(repo, 'skills'), 'team-skill');

    git(repo, 'init', '--quiet');
    sandbox = { personalRoot, repo };
  });

  afterEach(() => {
    rmSync(workspace, { force: true, recursive: true });
  });

  it('fans a personal skill out everywhere a committed one goes', () => {
    writeSkill(sandbox.personalRoot, 'my-draft');

    const result = sync(sandbox);

    expect(result.status).toBe(0);
    expect(result.output).toContain('(personal)');
    for (const dir of ['.agents/skills', '.claude/skills', '.gemini/skills']) {
      expect(
        git(sandbox.repo, 'check-ignore', '-q', `${dir}/my-draft`, '--'),
      ).toBe('');
    }
    expect(sync(sandbox, ['--check']).status).toBe(0);
  });

  it('refuses a personal skill that collides with a committed one', () => {
    writeSkill(sandbox.personalRoot, 'team-skill');

    const result = sync(sandbox);

    expect(result.status).toBe(1);
    expect(result.output).toContain(
      "personal skill 'team-skill' collides with committed skills/team-skill",
    );
    expect(result.output).toContain('--allow-shadow');
  });

  it('lets --allow-shadow run a private fork, and check agrees', () => {
    writeSkill(sandbox.personalRoot, 'team-skill');

    expect(sync(sandbox, ['--allow-shadow']).status).toBe(0);
    expect(sync(sandbox, ['--check', '--allow-shadow']).status).toBe(0);
    expect(
      git(sandbox.repo, 'status', '--porcelain', '--ignored=no'),
    ).not.toContain('.agents/skills');
  });

  it('leaves git status clean with personal skills present', () => {
    writeSkill(sandbox.personalRoot, 'my-draft');
    sync(sandbox);

    const status = git(sandbox.repo, 'status', '--porcelain');

    expect(status).not.toContain('my-draft');
    expect(status).not.toContain('.claude/');
    expect(status).not.toContain('.gemini/');
  });

  it('refuses to use a personal root inside the repository', () => {
    const inside = join(sandbox.repo, 'inside-skills');
    writeSkill(inside, 'my-draft');

    const result = sync({ ...sandbox, personalRoot: inside });

    expect(result.status).toBe(1);
    expect(result.output).toContain('is inside the repository');
  });

  describe('personal.sh new', () => {
    it('scaffolds, syncs, and says how to invoke it', () => {
      const result = personal(sandbox, ['new', 'my-experiment']);

      expect(result.status).toBe(0);
      expect(result.output).toContain('/my-experiment');
      expect(result.output).toContain('promote my-experiment');
      for (const dir of LINK_DIRS) {
        expect(existsSync(join(sandbox.repo, dir, 'my-experiment'))).toBe(true);
      }
      expect(sync(sandbox, ['--check']).status).toBe(0);
    });

    // A scaffold that has to be fixed before it validates is worse than none:
    // the first thing it teaches is that the template is wrong.
    it('writes frontmatter that satisfies skillFrontmatterSchema as-is', () => {
      personal(sandbox, ['new', 'my-experiment']);

      const parsed = skillFrontmatterSchema.safeParse(
        parseSkillFrontmatterForValidation(
          readFileSync(
            join(sandbox.personalRoot, 'my-experiment', 'SKILL.md'),
            'utf8',
          ),
        ),
      );

      expect(parsed.success).toBe(true);
    });

    it('rejects a committed name up front, before writing anything', () => {
      const result = personal(sandbox, ['new', 'team-skill']);

      expect(result.status).toBe(1);
      expect(result.output).toContain(
        "personal skill 'team-skill' collides with committed skills/team-skill",
      );
      expect(existsSync(join(sandbox.personalRoot, 'team-skill'))).toBe(false);
    });

    it('rejects a name that is not a kebab-case slug', () => {
      const result = personal(sandbox, ['new', 'My_Skill']);

      expect(result.status).toBe(1);
      expect(result.output).toContain('kebab-case slug');
    });

    it('refuses to overwrite an existing personal skill', () => {
      personal(sandbox, ['new', 'my-experiment']);
      writeFileSync(
        join(sandbox.personalRoot, 'my-experiment', 'SKILL.md'),
        skillMarkdown('my-experiment'),
      );

      const result = personal(sandbox, ['new', 'my-experiment']);

      expect(result.status).toBe(1);
      expect(result.output).toContain('already exists');
      expect(
        readFileSync(
          join(sandbox.personalRoot, 'my-experiment', 'SKILL.md'),
          'utf8',
        ),
      ).toBe(skillMarkdown('my-experiment'));
    });
  });

  describe('personal.sh list', () => {
    it('reports each skill as linked in every fan-out dir', () => {
      personal(sandbox, ['new', 'my-experiment']);

      const result = personal(sandbox, ['list']);

      expect(result.status).toBe(0);
      for (const dir of LINK_DIRS) {
        expect(result.output).toMatch(
          new RegExp(`${dir}/my-experiment.*linked`),
        );
      }
      expect(result.output).not.toContain('occupied by something else');
    });

    it('says so, kindly, when there are none', () => {
      const result = personal(sandbox, ['list']);

      expect(result.status).toBe(0);
      expect(result.output).toContain('No personal skills');
      expect(result.output).toContain('new <name>');
    });
  });

  describe('personal.sh promote / demote', () => {
    const stagedPaths = (repo: string): readonly string[] =>
      git(repo, 'diff', '--cached', '--name-only')
        .split('\n')
        .filter((line) => line.length > 0);

    it('moves the skill into skills/, re-links it, and stages it', () => {
      personal(sandbox, ['new', 'my-experiment']);

      const result = personal(sandbox, ['promote', 'my-experiment']);

      expect(result.status).toBe(0);
      expect(
        existsSync(join(sandbox.repo, 'skills', 'my-experiment', 'SKILL.md')),
      ).toBe(true);
      // Moved, not copied — two copies of one skill is where they diverge.
      expect(existsSync(join(sandbox.personalRoot, 'my-experiment'))).toBe(
        false,
      );
      expect(stagedPaths(sandbox.repo)).toContain(
        'skills/my-experiment/SKILL.md',
      );
      expect(sync(sandbox, ['--check']).status).toBe(0);
    });

    it('points the generated links at the committed copy afterwards', () => {
      personal(sandbox, ['new', 'my-experiment']);
      personal(sandbox, ['promote', 'my-experiment']);

      // The link now resolves inside the repo, so it is no longer personal —
      // and personal.sh list agrees it is gone from the tier.
      expect(personal(sandbox, ['list']).output).toContain(
        'No personal skills',
      );
      expect(
        readFileSync(
          join(sandbox.repo, '.claude', 'skills', 'my-experiment', 'SKILL.md'),
          'utf8',
        ),
      ).toContain('name: my-experiment');
    });

    it('names the docs touchpoints and the right commit scope', () => {
      personal(sandbox, ['new', 'my-experiment']);

      const result = personal(sandbox, ['promote', 'my-experiment']);

      expect(result.output).toContain('docs/Skills.md');
      expect(result.output).toContain('feat(monorepo)');
      expect(result.output).toContain('demote my-experiment');
    });

    it('refuses to overwrite a committed skill of the same name', () => {
      writeSkill(sandbox.personalRoot, 'shadow');
      writeSkill(join(sandbox.repo, 'skills'), 'shadow');

      const result = personal(sandbox, ['promote', 'shadow']);

      expect(result.status).toBe(1);
      expect(result.output).toContain('already exists');
      expect(existsSync(join(sandbox.personalRoot, 'shadow'))).toBe(true);
    });

    it('round-trips: promote then demote restores the personal skill', () => {
      personal(sandbox, ['new', 'my-experiment']);
      const original = readFileSync(
        join(sandbox.personalRoot, 'my-experiment', 'SKILL.md'),
        'utf8',
      );
      personal(sandbox, ['promote', 'my-experiment']);

      const result = personal(sandbox, ['demote', 'my-experiment']);

      expect(result.status).toBe(0);
      expect(
        readFileSync(
          join(sandbox.personalRoot, 'my-experiment', 'SKILL.md'),
          'utf8',
        ),
      ).toBe(original);
      expect(existsSync(join(sandbox.repo, 'skills', 'my-experiment'))).toBe(
        false,
      );
      expect(stagedPaths(sandbox.repo)).not.toContain(
        'skills/my-experiment/SKILL.md',
      );
      expect(sync(sandbox, ['--check']).status).toBe(0);
    });

    // Undoing your own un-pushed promote is a convenience; deleting a skill the
    // repo ships is not something an inverse command should do quietly.
    it('refuses to demote a skill that is already committed', () => {
      git(sandbox.repo, 'add', '-f', 'skills/team-skill');
      git(
        sandbox.repo,
        '-c',
        'user.email=test@example.com',
        '-c',
        'user.name=Test',
        'commit',
        '--quiet',
        '-m',
        'add team-skill',
      );

      const result = personal(sandbox, ['demote', 'team-skill']);

      expect(result.status).toBe(1);
      expect(result.output).toContain('already committed');
      expect(
        existsSync(join(sandbox.repo, 'skills', 'team-skill', 'SKILL.md')),
      ).toBe(true);
    });
  });

  // The shell pipeline and the TypeScript injection path each resolve the
  // personal root themselves — a shell script that had to boot Node to find a
  // directory would be a worse trade than a pinning test. This is that pin: one
  // contract, two implementations, asserted equal. Change one, change both.
  describe('one personal root, two implementations', () => {
    const shellRoot = (env: NodeJS.ProcessEnv): string =>
      execFileSync(
        'bash',
        [
          '-c',
          `source "${join(SCRIPTS_SRC, 'common.sh')}" && resolve_personal_skills_root`,
        ],
        { encoding: 'utf8', env },
      ).trim();

    it('agrees on the default root', () => {
      const env = { ...process.env };
      delete env.OPENTHROTTLE_PERSONAL_SKILLS_DIR;

      expect(shellRoot(env)).toBe(
        resolvePersonalSkillsRoot({ HOME: env.HOME }),
      );
    });

    it('agrees on an explicit override', () => {
      const env = {
        ...process.env,
        OPENTHROTTLE_PERSONAL_SKILLS_DIR: '/custom/skills',
      };

      expect(shellRoot(env)).toBe(
        resolvePersonalSkillsRoot({
          OPENTHROTTLE_PERSONAL_SKILLS_DIR: '/custom/skills',
        }),
      );
    });

    it('agrees that an empty override falls back to the default', () => {
      const env = { ...process.env, OPENTHROTTLE_PERSONAL_SKILLS_DIR: '' };

      expect(shellRoot(env)).toBe(
        resolvePersonalSkillsRoot({
          HOME: env.HOME,
          OPENTHROTTLE_PERSONAL_SKILLS_DIR: '',
        }),
      );
    });
  });

  // One tier, two consumers. If these ever disagree about what a personal skill
  // is, the person has two "personal" directories and no way to tell which one
  // a given tool read.
  describe('the same skill reaches both consumers', () => {
    it('lands in this repo via sync and in a foreign repo via injection', () => {
      writeSkill(sandbox.personalRoot, 'my-draft');
      const foreignRepo = join(workspace, 'foreign');
      mkdirSync(foreignRepo, { recursive: true });
      git(foreignRepo, 'init', '--quiet');

      // (a) this repo, through the shell pipeline
      expect(sync(sandbox).status).toBe(0);
      for (const dir of LINK_DIRS) {
        expect(existsSync(join(sandbox.repo, dir, 'my-draft'))).toBe(true);
      }

      // (b) a foreign repo, through the TypeScript injection path — reading the
      // root from the SAME contract, gated by the foreign-only ENABLED toggle.
      const env = {
        OPENTHROTTLE_PERSONAL_SKILLS_DIR: sandbox.personalRoot,
        OPENTHROTTLE_PERSONAL_SKILLS_ENABLED: 'true',
      };
      const personalSkillsDir = resolvePersonalSkillsDir(env);
      expect(personalSkillsDir).toBe(sandbox.personalRoot);

      const result = ensureMaterialized({
        env,
        otCuratedSkillsDir: join(sandbox.repo, 'skills'),
        personalSkillsDir,
        repoPath: foreignRepo,
      });

      expect(result.injectedNames).toContain('my-draft');
      expect(
        readFileSync(
          join(foreignRepo, '.agents', 'skills', 'my-draft', 'SKILL.md'),
          'utf8',
        ),
      ).toBe(
        readFileSync(
          join(sandbox.personalRoot, 'my-draft', 'SKILL.md'),
          'utf8',
        ),
      );
    });

    it('injects nothing personal while the foreign toggle is off', () => {
      expect(
        resolvePersonalSkillsDir({
          OPENTHROTTLE_PERSONAL_SKILLS_DIR: sandbox.personalRoot,
        }),
      ).toBeUndefined();
      // …while the in-repo tier needs no toggle at all: presence is the opt-in.
      expect(
        resolvePersonalSkillsRoot({
          OPENTHROTTLE_PERSONAL_SKILLS_DIR: sandbox.personalRoot,
        }),
      ).toBe(sandbox.personalRoot);
    });
  });

  describe('reaping and teardown', () => {
    it('reaps every link when the personal skill is deleted', () => {
      writeSkill(sandbox.personalRoot, 'my-draft');
      sync(sandbox);
      rmSync(join(sandbox.personalRoot, 'my-draft'), {
        force: true,
        recursive: true,
      });

      const result = sync(sandbox);

      expect(result.status).toBe(0);
      expect(result.output).toContain('personal skill no longer at');
      for (const dir of LINK_DIRS) {
        expect(existsSync(join(sandbox.repo, dir, 'my-draft'))).toBe(false);
      }
      expect(sync(sandbox, ['--check']).status).toBe(0);
    });

    it('reaps the old links when a personal skill is renamed', () => {
      writeSkill(sandbox.personalRoot, 'before');
      sync(sandbox);
      rmSync(join(sandbox.personalRoot, 'before'), {
        force: true,
        recursive: true,
      });
      writeSkill(sandbox.personalRoot, 'after');

      sync(sandbox);

      for (const dir of LINK_DIRS) {
        expect(existsSync(join(sandbox.repo, dir, 'before'))).toBe(false);
        expect(existsSync(join(sandbox.repo, dir, 'after'))).toBe(true);
      }
    });

    // A link left dangling between runs must read as actionable drift, not a
    // crash and not a generic shrug — the tier is the whole hint.
    it('reports a dangling personal link as drift naming the tier', () => {
      writeSkill(sandbox.personalRoot, 'my-draft');
      sync(sandbox);
      rmSync(join(sandbox.personalRoot, 'my-draft'), {
        force: true,
        recursive: true,
      });

      const result = sync(sandbox, ['--check']);

      expect(result.status).toBe(1);
      expect(result.output).toContain('dangling PERSONAL link');
      expect(result.output).toContain('run sync.sh to reap it');
    });

    it('survives the personal root being deleted wholesale', () => {
      writeSkill(sandbox.personalRoot, 'my-draft');
      sync(sandbox);
      rmSync(sandbox.personalRoot, { force: true, recursive: true });

      const result = sync(sandbox);

      expect(result.status).toBe(0);
      for (const dir of LINK_DIRS) {
        expect(existsSync(join(sandbox.repo, dir, 'my-draft'))).toBe(false);
      }
      expect(sync(sandbox, ['--check']).status).toBe(0);
    });

    it('cleanup removes personal links and prunes emptied roots, leaving the skill intact', () => {
      writeSkill(sandbox.personalRoot, 'my-draft');
      sync(sandbox);

      const result = cleanup(sandbox);

      expect(result.status).toBe(0);
      expect(result.output).toContain('the skill itself is untouched');
      for (const dir of LINK_DIRS) {
        expect(existsSync(join(sandbox.repo, dir, 'my-draft'))).toBe(false);
      }
      // rmdir semantics: a fan-out root that exists only for us is pruned once
      // emptied, and .gemini/ with it.
      expect(existsSync(join(sandbox.repo, '.gemini'))).toBe(false);
      // The source outside the repo is never a casualty of unlinking.
      expect(
        existsSync(join(sandbox.personalRoot, 'my-draft', 'SKILL.md')),
      ).toBe(true);
    });
  });

  describe('CI parity — no personal root anywhere', () => {
    it('is byte-identical with the root empty or missing', () => {
      writeSkill(join(sandbox.repo, 'skills'), 'another-team-skill');
      const missing = {
        ...sandbox,
        personalRoot: join(sandbox.personalRoot, 'nope'),
      };
      sync(sandbox); // settle the layout so both runs below are pure no-ops

      const empty = sync(sandbox);
      const absent = sync(missing);

      expect(empty.status).toBe(0);
      expect(absent.status).toBe(0);
      expect(absent.output).toBe(empty.output);
      expect(empty.output).not.toContain('(personal)');
      expect(empty.output).not.toContain('Stage 1b');
      expect(sync(sandbox, ['--check']).status).toBe(0);
      expect(sync(missing, ['--check']).output).toBe(
        sync(sandbox, ['--check']).output,
      );
    });

    it('never writes a personal skill into skills-lock.json', () => {
      const lockfile = join(sandbox.repo, 'skills-lock.json');
      const original = JSON.stringify(
        { skills: { 'team-skill-vendored': { version: '1' } } },
        null,
        2,
      );
      writeFileSync(lockfile, original);
      writeSkill(sandbox.personalRoot, 'my-draft');

      sync(sandbox);

      expect(readFileSync(lockfile, 'utf8')).toBe(original);
    });
  });

  // The two tables in docs/Skills.md are the repo's published catalog. A
  // personal skill is structurally incapable of appearing there — it exists
  // neither in skills/ nor in skills-lock.json — so pinning both tables to
  // their real sources is what keeps a future change from leaking one in.
  describe('docs/Skills.md lists committed skills only', () => {
    const skillsDoc = readFileSync(
      join(REPO_ROOT, 'docs', 'Skills.md'),
      'utf8',
    );

    const namesInSection = (heading: string): readonly string[] => {
      const start = skillsDoc.indexOf(heading);
      expect(start).toBeGreaterThan(-1);
      const rest = skillsDoc.slice(start + heading.length);
      const end = rest.indexOf('\n## ');
      const body = end === -1 ? rest : rest.slice(0, end);
      return [...body.matchAll(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)+)\b/g)].map(
        (match) => match[1],
      );
    };

    it('names only skills that exist under skills/ or skills-lock.json', () => {
      const authored = new Set(
        readdirSync(join(REPO_ROOT, 'skills'), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name),
      );
      const lock: unknown = JSON.parse(
        readFileSync(join(REPO_ROOT, 'skills-lock.json'), 'utf8'),
      );
      const vendored = new Set(
        typeof lock === 'object' && lock !== null && 'skills' in lock
          ? Object.keys(Object(lock.skills))
          : [],
      );

      const listed = namesInSection('## OT-owned skills (`skills/`)');

      expect(listed.length).toBeGreaterThan(0);
      const unknown = listed.filter(
        (name) => !authored.has(name) && !vendored.has(name),
      );
      expect(unknown).toEqual([]);
    });
  });

  describe('staging guard', () => {
    const runGate = (repo: string, personalRoot: string): RunResult =>
      runCommand(
        'sh',
        ['-c', '. ./.husky/lib/personal-skills-gate.sh'],
        repo,
        personalRoot,
      );

    it('blocks a force-staged personal link and names it', () => {
      writeSkill(sandbox.personalRoot, 'my-draft');
      sync(sandbox);
      git(sandbox.repo, 'add', '-f', '.agents/skills/my-draft');

      const result = runGate(sandbox.repo, sandbox.personalRoot);

      expect(result.status).toBe(1);
      expect(result.output).toContain('.agents/skills/my-draft');
      expect(result.output).toContain('personal.sh promote');
    });

    // git refuses to index anything beneath a symlinked directory, so a file
    // reached THROUGH a personal link cannot be staged in the first place. The
    // gate still walks a staged path's ancestors — defence in depth for a
    // layout git does allow (a copy-mode materialization, say) — but this is
    // where the guarantee actually comes from, so assert it rather than mock a
    // state git will not produce.
    it('cannot even stage a file reached through a personal link', () => {
      writeSkill(sandbox.personalRoot, 'my-draft');
      sync(sandbox);

      expect(() =>
        git(sandbox.repo, 'add', '-f', '.claude/skills/my-draft/SKILL.md'),
      ).toThrow(/beyond a symbolic link/);
    });

    it('passes a commit that stages only committed skills', () => {
      writeSkill(sandbox.personalRoot, 'my-draft');
      sync(sandbox);
      git(sandbox.repo, 'add', '-f', 'skills/team-skill/SKILL.md');

      expect(runGate(sandbox.repo, sandbox.personalRoot).status).toBe(0);
    });
  });
});

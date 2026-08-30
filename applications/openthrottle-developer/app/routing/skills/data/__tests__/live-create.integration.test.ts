// @vitest-environment node
/**
 * @description Live verification of the create-skill flow: the REAL
 * `createSkillFile` against the REAL checkout and the REAL ot-skill-sync
 * script, with nothing mocked. A jsdom test cannot prove a file landed on disk,
 * that the link is gitignored, or that sync accepted the result.
 *
 * OPT-IN, because it genuinely mutates the working tree and shells out:
 *
 *   OPENTHROTTLE_LIVE_SKILL_CREATE=1 pnpm exec vitest run \
 *     app/routing/skills/data/__tests__/live-create.integration.test.ts
 *
 * It skips by default so the ordinary suite (and CI) never writes to the
 * checkout. Run it from a clean tree — it asserts on `git status`.
 *
 * While it runs it points the personal root at a throwaway fixture directory,
 * so your own personal skills are unlinked from this checkout for the duration
 * and re-linked by `afterAll`. That is inherent — sync links whatever root is
 * configured — but it has two consequences worth knowing:
 *
 * - The personal-root override MUST be restored BEFORE the final re-sync.
 *   Re-syncing while it still points at the deleted fixture root leaves your
 *   real personal skills unlinked, and `sync.sh --check` then fails for reasons
 *   that have nothing to do with this test. (It did exactly that once.)
 * - There is deliberately no "layout is green before we start" pre-flight. Run
 *   under the fixture root before any sync has happened, it reports your real
 *   personal skills as drift — a failure that says nothing about this feature.
 *   The per-destination tests below run `--check` after each create, which is
 *   the assertion that actually matters.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isRecord } from '@openthrottle/nodejs-utils';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const IS_ENABLED = process.env.OPENTHROTTLE_LIVE_SKILL_CREATE === '1';

/** The checkout under test — wherever this file happens to live. */
const WORKTREE = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

const PERSONAL_SLUG = 'live-verify-personal-skill';
const REPO_SLUG = 'live-verify-repo-skill';

let personalRoot: string;
let originalPersonalRoot: string | undefined;
let createSkillFile: typeof import('~/routing/skills/data/create-skill-file.server').createSkillFile;

const contentFor = (slug: string): string =>
  `---\nname: ${slug}\ndescription: Live verification fixture for the create flow.\n---\n\n# ${slug}\n\nFixture body.\n`;

const git = (...args: string[]): string =>
  execFileSync('git', args, { cwd: WORKTREE, encoding: 'utf8' });

/**
 * `git status --porcelain`, minus this file. The test itself is untracked while
 * it runs, and it is not what any of these assertions is about.
 */
const worktreeStatus = (): readonly string[] =>
  git('status', '--porcelain')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.includes('live-create.integration.test.ts'));

const syncCheck = (): number => {
  try {
    execFileSync('bash', ['skills/ot-skill-sync/scripts/sync.sh', '--check'], {
      cwd: WORKTREE,
      encoding: 'utf8',
      env: process.env,
    });
    return 0;
  } catch (error) {
    // execFileSync attaches status/stdout/stderr to the thrown Error; narrow
    // rather than assert so the lint rule against type assertions holds.
    const failure: Record<string, unknown> = isRecord(error) ? error : {};
    const status = failure.status;
    const stdout = typeof failure.stdout === 'string' ? failure.stdout : '';
    const stderr = typeof failure.stderr === 'string' ? failure.stderr : '';
    console.error('sync --check output:\n', stdout, stderr);
    return typeof status === 'number' ? status : 1;
  }
};

describe.runIf(IS_ENABLED)('live create flow', () => {
  beforeAll(async () => {
    originalPersonalRoot = process.env.OPENTHROTTLE_PERSONAL_SKILLS_DIR;
    personalRoot = mkdtempSync(join(tmpdir(), 'ot-live-personal-'));
    process.env.OPENTHROTTLE_PERSONAL_SKILLS_DIR = personalRoot;
    process.env.WORKSPACE_ROOT = WORKTREE;

    ({ createSkillFile } =
      await import('~/routing/skills/data/create-skill-file.server'));
  });

  afterAll(() => {
    rmSync(join(WORKTREE, 'skills', REPO_SLUG), {
      force: true,
      recursive: true,
    });
    rmSync(personalRoot, { force: true, recursive: true });

    // Restore the real personal root BEFORE re-syncing. Re-syncing with the
    // override still pointing at the now-deleted fixture root makes sync prune
    // the links to the author's actual personal skills.
    if (originalPersonalRoot === undefined) {
      delete process.env.OPENTHROTTLE_PERSONAL_SKILLS_DIR;
    } else {
      process.env.OPENTHROTTLE_PERSONAL_SKILLS_DIR = originalPersonalRoot;
    }

    // Re-sync so the links the fixtures created are pruned again.
    execFileSync('bash', ['skills/ot-skill-sync/scripts/sync.sh'], {
      cwd: WORKTREE,
      env: process.env,
      stdio: 'pipe',
    });
  });

  test('creates a PERSONAL skill outside the repo and links it in', () => {
    const result = createSkillFile({
      content: contentFor(PERSONAL_SLUG),
      destination: 'personal',
      slug: PERSONAL_SLUG,
    });

    expect(result).toEqual({ ok: true, slug: PERSONAL_SLUG });

    // 1. The file is under the personal root, not in the repo.
    const personalPath = join(personalRoot, PERSONAL_SLUG, 'SKILL.md');
    expect(existsSync(personalPath)).toBe(true);
    expect(readFileSync(personalPath, 'utf8')).toBe(contentFor(PERSONAL_SLUG));
    expect(existsSync(join(WORKTREE, 'skills', PERSONAL_SLUG))).toBe(false);

    // 2. It is linked into the layout discovery scans.
    expect(existsSync(join(WORKTREE, '.agents/skills', PERSONAL_SLUG))).toBe(
      true,
    );

    // 3. The link is gitignored, so the worktree stays clean.
    expect(worktreeStatus()).toEqual([]);
    expect(() =>
      git('check-ignore', '-q', `.agents/skills/${PERSONAL_SLUG}`),
    ).not.toThrow();

    // 4. Sync still considers the layout valid.
    expect(syncCheck()).toBe(0);
  });

  test('creates a REPO skill as exactly one untracked directory', () => {
    const result = createSkillFile({
      content: contentFor(REPO_SLUG),
      destination: 'repo',
      slug: REPO_SLUG,
    });

    expect(result).toEqual({ ok: true, slug: REPO_SLUG });

    const repoPath = join(WORKTREE, 'skills', REPO_SLUG, 'SKILL.md');
    expect(existsSync(repoPath)).toBe(true);
    expect(readFileSync(repoPath, 'utf8')).toBe(contentFor(REPO_SLUG));

    // Exactly the new directory shows up — no generated links leaking in.
    expect(worktreeStatus()).toEqual([`?? skills/${REPO_SLUG}/`]);

    expect(existsSync(join(WORKTREE, '.agents/skills', REPO_SLUG))).toBe(true);
    expect(syncCheck()).toBe(0);
  });

  describe('refusals leave nothing on disk', () => {
    const expectNothingCreated = (slug: string): void => {
      expect(existsSync(join(WORKTREE, 'skills', slug))).toBe(false);
      expect(existsSync(join(personalRoot, slug))).toBe(false);
    };

    test('a duplicate slug is refused', () => {
      const result = createSkillFile({
        content: contentFor(REPO_SLUG),
        destination: 'personal',
        slug: REPO_SLUG,
      });

      expect(result.ok).toBe(false);
      expect(existsSync(join(personalRoot, REPO_SLUG))).toBe(false);
    });

    test('a non-kebab slug is refused', () => {
      const result = createSkillFile({
        content: contentFor('Not_Kebab'),
        destination: 'repo',
        slug: 'Not_Kebab',
      });

      expect(result.ok).toBe(false);
      expectNothingCreated('Not_Kebab');
    });

    test('an empty description is refused', () => {
      const slug = 'live-verify-no-description';
      const result = createSkillFile({
        content: `---\nname: ${slug}\ndescription: \n---\n\n# ${slug}\n`,
        destination: 'repo',
        slug,
      });

      expect(result.ok).toBe(false);
      expectNothingCreated(slug);
    });

    test('a hand-broken frontmatter body is refused', () => {
      const slug = 'live-verify-broken-frontmatter';
      const result = createSkillFile({
        content: `---\nthis is not: [valid: yaml\n---\n\n# ${slug}\n`,
        destination: 'repo',
        slug,
      });

      expect(result.ok).toBe(false);
      expectNothingCreated(slug);
    });

    test('the worktree is still clean apart from the repo fixture', () => {
      expect(worktreeStatus()).toEqual([`?? skills/${REPO_SLUG}/`]);
      expect(syncCheck()).toBe(0);
    });
  });

  test('the edit path can read back and rewrite the new repo skill', async () => {
    const { readSkillFileBySlug } =
      await import('~/routing/skills/data/read-skill-file.server');
    const { writeSkillFileBySlug } =
      await import('~/routing/skills/data/write-skill-file.server');

    const read = readSkillFileBySlug(REPO_SLUG);
    expect(read.entry?.slug).toBe(REPO_SLUG);
    expect(read.entry?.source).toBe('openthrottle');
    expect(read.rawContent).toBe(contentFor(REPO_SLUG));

    const edited = contentFor(REPO_SLUG).replace(
      'Fixture body.',
      'Edited through the existing save path.',
    );
    expect(writeSkillFileBySlug(REPO_SLUG, edited)).toEqual({ ok: true });
    expect(readSkillFileBySlug(REPO_SLUG).rawContent).toBe(edited);
  });

  test('the personal skill reads back as Personal, not External', async () => {
    const { readSkillFileBySlug } =
      await import('~/routing/skills/data/read-skill-file.server');

    const read = readSkillFileBySlug(PERSONAL_SLUG);
    expect(read.entry?.slug).toBe(PERSONAL_SLUG);
    expect(read.entry?.isPersonal).toBe(true);
  });
});

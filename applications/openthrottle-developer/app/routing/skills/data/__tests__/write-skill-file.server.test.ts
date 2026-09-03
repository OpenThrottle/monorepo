// @vitest-environment node
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILL_WRITE_COPY } from '~/routing/skills/data/data.copy';

vi.mock('~/routing/agents/data/discover-repo-skills.server', () => ({
  discoverRepoSkills: vi.fn(),
}));

vi.mock('~/routing/agents/data/resolve-monorepo-root.server', () => ({
  getMonorepoRoot: vi.fn(),
}));

const { discoverRepoSkills } =
  await import('~/routing/agents/data/discover-repo-skills.server');
const { getMonorepoRoot } =
  await import('~/routing/agents/data/resolve-monorepo-root.server');
const { writeSkillFileBySlug } =
  await import('~/routing/skills/data/write-skill-file.server');

const mockDiscoverRepoSkills = vi.mocked(discoverRepoSkills);
const mockGetMonorepoRoot = vi.mocked(getMonorepoRoot);

const ORIGINAL_CONTENT = `---
name: my-skill
description: Original description.
---

# My skill
`;

const VALID_EDIT = `---
name: my-skill
description: Edited description.
---

# My skill (edited)
`;

const entryFor = (
  repoRelativePath: string,
  source: RepoSkillEntry['source'] = 'openthrottle',
  overlay?: 'custom' | 'personal',
): RepoSkillEntry => ({
  disableModelInvocation: undefined,
  isCustom: overlay === 'custom' ? true : undefined,
  isPersonal: overlay === 'personal' ? true : undefined,
  layout: 'agents',
  repoRelativePath,
  slug: 'my-skill',
  source,
  summary: 'Original description.',
  tags: undefined,
});

const PERSONAL_DIR_ENV = 'OPENTHROTTLE_PERSONAL_SKILLS_DIR';

describe('writeSkillFileBySlug', () => {
  let originalPersonalDir: string | undefined;
  let root: string;
  let skillPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalPersonalDir = process.env[PERSONAL_DIR_ENV];
    root = mkdtempSync(join(tmpdir(), 'ot-write-skill-'));
    const skillDir = join(root, '.agents/skills/my-skill');
    mkdirSync(skillDir, { recursive: true });
    skillPath = join(skillDir, 'SKILL.md');
    writeFileSync(skillPath, ORIGINAL_CONTENT);

    mockGetMonorepoRoot.mockReturnValue(root);
    mockDiscoverRepoSkills.mockReturnValue([
      entryFor('.agents/skills/my-skill/SKILL.md'),
    ]);
  });

  afterEach(() => {
    if (originalPersonalDir === undefined) {
      delete process.env[PERSONAL_DIR_ENV];
    } else {
      process.env[PERSONAL_DIR_ENV] = originalPersonalDir;
    }
    rmSync(root, { force: true, recursive: true });
  });

  test('writes the full file for a valid edit', () => {
    const result = writeSkillFileBySlug('my-skill', VALID_EDIT);

    expect(result).toEqual({ ok: true });
    expect(readFileSync(skillPath, 'utf8')).toBe(VALID_EDIT);
  });

  test('refuses when no monorepo root resolves', () => {
    mockGetMonorepoRoot.mockReturnValue(null);

    const result = writeSkillFileBySlug('my-skill', VALID_EDIT);

    expect(result.ok).toBe(false);
    expect(readFileSync(skillPath, 'utf8')).toBe(ORIGINAL_CONTENT);
  });

  test('rejects an unknown slug without writing', () => {
    const result = writeSkillFileBySlug('not-discovered', VALID_EDIT);

    expect(result.ok).toBe(false);
    expect(readFileSync(skillPath, 'utf8')).toBe(ORIGINAL_CONTENT);
  });

  test('rejects a discovered path that escapes the repository', () => {
    const outsideDir = mkdtempSync(join(tmpdir(), 'ot-outside-'));
    const outsidePath = join(outsideDir, 'SKILL.md');
    writeFileSync(outsidePath, ORIGINAL_CONTENT);
    mockDiscoverRepoSkills.mockReturnValue([
      entryFor(`../${outsideDir.split('/').pop() ?? ''}/SKILL.md`),
    ]);

    const result = writeSkillFileBySlug('my-skill', VALID_EDIT);

    expect(result.ok).toBe(false);
    expect(readFileSync(outsidePath, 'utf8')).toBe(ORIGINAL_CONTENT);
    rmSync(outsideDir, { force: true, recursive: true });
  });

  test('rejects content whose frontmatter no longer parses', () => {
    const result = writeSkillFileBySlug(
      'my-skill',
      '---\ndescription: Missing the name key.\n---\n\n# Broken\n',
    );

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toContain('no longer validates');
    }
    expect(readFileSync(skillPath, 'utf8')).toBe(ORIGINAL_CONTENT);
  });

  test('rejects content whose name no longer matches the slug', () => {
    const result = writeSkillFileBySlug(
      'my-skill',
      '---\nname: renamed-skill\ndescription: Valid but renamed.\n---\n\n# Renamed\n',
    );

    expect(result.ok).toBe(false);
    expect(readFileSync(skillPath, 'utf8')).toBe(ORIGINAL_CONTENT);
  });

  // The custom tier also carries `source: 'external'` — it is a real directory
  // the lockfile does not claim — but it is the repo's own file, so it is
  // writable in place, unlike a lockfile install.
  test('writes a custom (repo-authored) skill in place', () => {
    mockDiscoverRepoSkills.mockReturnValue([
      entryFor('.agents/skills/my-skill/SKILL.md', 'external', 'custom'),
    ]);

    const result = writeSkillFileBySlug('my-skill', VALID_EDIT);

    expect(result).toEqual({ ok: true });
    expect(readFileSync(skillPath, 'utf8')).toBe(VALID_EDIT);
    expect(lstatSync(skillPath).isSymbolicLink()).toBe(false);
  });

  test('refuses an externally sourced skill without writing', () => {
    mockDiscoverRepoSkills.mockReturnValue([
      entryFor('.agents/skills/my-skill/SKILL.md', 'external'),
    ]);

    const result = writeSkillFileBySlug('my-skill', VALID_EDIT);

    expect(result).toEqual({
      error: SKILL_WRITE_COPY.externalSkillError,
      ok: false,
    });
    expect(readFileSync(skillPath, 'utf8')).toBe(ORIGINAL_CONTENT);
  });

  // The personal tier carries `source: 'external'` because it is not authored
  // under skills/, but it is the author's own — writable, and written THROUGH
  // the gitignored symlink so ot-skill-sync still owns the link.
  test('writes a personal skill through the in-repo symlink', () => {
    const personalRoot = mkdtempSync(join(tmpdir(), 'ot-personal-skills-'));
    const personalSkillDir = join(personalRoot, 'my-skill');
    mkdirSync(personalSkillDir, { recursive: true });
    const personalSkillPath = join(personalSkillDir, 'SKILL.md');
    writeFileSync(personalSkillPath, ORIGINAL_CONTENT);

    const linkPath = join(root, '.agents/skills/my-personal-skill');
    symlinkSync(personalSkillDir, linkPath);

    process.env[PERSONAL_DIR_ENV] = personalRoot;
    mockDiscoverRepoSkills.mockReturnValue([
      entryFor(
        '.agents/skills/my-personal-skill/SKILL.md',
        'external',
        'personal',
      ),
    ]);

    const result = writeSkillFileBySlug('my-skill', VALID_EDIT);

    expect(result).toEqual({ ok: true });
    expect(readFileSync(personalSkillPath, 'utf8')).toBe(VALID_EDIT);
    expect(lstatSync(linkPath).isSymbolicLink()).toBe(true);

    rmSync(personalRoot, { force: true, recursive: true });
  });

  test('refuses a personal-flagged entry whose path is not under the personal root', () => {
    const personalRoot = mkdtempSync(join(tmpdir(), 'ot-personal-skills-'));
    const rogueRoot = mkdtempSync(join(tmpdir(), 'ot-rogue-skills-'));
    const rogueSkillDir = join(rogueRoot, 'my-skill');
    mkdirSync(rogueSkillDir, { recursive: true });
    const rogueSkillPath = join(rogueSkillDir, 'SKILL.md');
    writeFileSync(rogueSkillPath, ORIGINAL_CONTENT);
    symlinkSync(rogueSkillDir, join(root, '.agents/skills/rogue'));

    process.env[PERSONAL_DIR_ENV] = personalRoot;
    mockDiscoverRepoSkills.mockReturnValue([
      entryFor('.agents/skills/rogue/SKILL.md', 'external', 'personal'),
    ]);

    const result = writeSkillFileBySlug('my-skill', VALID_EDIT);

    expect(result).toEqual({
      error: SKILL_WRITE_COPY.pathEscapeError,
      ok: false,
    });
    expect(readFileSync(rogueSkillPath, 'utf8')).toBe(ORIGINAL_CONTENT);

    rmSync(personalRoot, { force: true, recursive: true });
    rmSync(rogueRoot, { force: true, recursive: true });
  });

  test('ignores a frontmatter source key on save (provenance is layout-derived)', () => {
    const content =
      '---\nname: my-skill\ndescription: Valid.\nsource: openthrottle\n---\n\n# Body\n';

    const result = writeSkillFileBySlug('my-skill', content);

    // Unknown keys are not validation errors — the key is written verbatim
    // but never read for provenance.
    expect(result).toEqual({ ok: true });
    expect(readFileSync(skillPath, 'utf8')).toBe(content);
  });
});

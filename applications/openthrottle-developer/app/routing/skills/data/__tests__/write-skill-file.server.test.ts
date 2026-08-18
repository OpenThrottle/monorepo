// @vitest-environment node
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
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
): RepoSkillEntry => ({
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath,
  slug: 'my-skill',
  source,
  summary: 'Original description.',
  tags: undefined,
});

describe('writeSkillFileBySlug', () => {
  let root: string;
  let skillPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
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

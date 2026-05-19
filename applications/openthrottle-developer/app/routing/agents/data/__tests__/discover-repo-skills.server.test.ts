// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { discoverRepoSkills } from '~/routing/agents/data/discover-repo-skills.server';

const tempDirs: string[] = [];

const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ot-discover-skills-'));
  tempDirs.push(dir);
  return dir;
};

const writeSkill = (
  root: string,
  layoutDir: string,
  slug: string,
  frontmatter: string,
): void => {
  const skillDir = join(root, layoutDir, slug);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    `---\n${frontmatter}\n---\n\n# ${slug}\n`,
  );
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { force: true, recursive: true });
    }
  }
});

describe('discoverRepoSkills', () => {
  test('returns empty list when monorepo root is null', () => {
    expect(discoverRepoSkills(null)).toEqual([]);
  });

  test('returns empty list when skill directories are missing', () => {
    const root = makeTempDir();
    expect(discoverRepoSkills(root)).toEqual([]);
  });

  test('discovers agents and cursor skills and sorts by layout then slug', () => {
    const root = makeTempDir();

    writeSkill(
      root,
      '.agents/skills',
      'zebra-skill',
      'name: zebra-skill\ndescription: Zebra agents skill.',
    );
    writeSkill(
      root,
      '.agents/skills',
      'alpha-skill',
      'name: alpha-skill\ndescription: Alpha agents skill.',
    );
    writeSkill(
      root,
      '.cursor/skills',
      'monitor-ci',
      'name: monitor-ci\ndescription: Cursor CI skill.',
    );

    expect(discoverRepoSkills(root)).toEqual([
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/alpha-skill/SKILL.md',
        slug: 'alpha-skill',
        summary: 'Alpha agents skill.',
      },
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/zebra-skill/SKILL.md',
        slug: 'zebra-skill',
        summary: 'Zebra agents skill.',
      },
      {
        layout: 'cursor',
        repoRelativePath: '.cursor/skills/monitor-ci/SKILL.md',
        slug: 'monitor-ci',
        summary: 'Cursor CI skill.',
      },
    ]);
  });

  test('uses folder name for slug when frontmatter name is missing', () => {
    const root = makeTempDir();

    writeSkill(
      root,
      '.agents/skills',
      'folder-only',
      'description: Summary from description field only.',
    );

    expect(discoverRepoSkills(root)).toEqual([
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/folder-only/SKILL.md',
        slug: 'folder-only',
        summary: 'Summary from description field only.',
      },
    ]);
  });

  test('parses folded multiline description from frontmatter', () => {
    const root = makeTempDir();

    writeSkill(
      root,
      '.agents/skills',
      'folded-skill',
      [
        'name: folded-skill',
        'description: >-',
        '  First line of the summary.',
        '  Second line of the summary.',
      ].join('\n'),
    );

    const [entry] = discoverRepoSkills(root);
    expect(entry?.summary).toBe(
      'First line of the summary. Second line of the summary.',
    );
  });

  test('uses summary placeholder when description is missing from frontmatter', () => {
    const root = makeTempDir();

    writeSkill(root, '.agents/skills', 'no-summary', 'name: no-summary');

    expect(discoverRepoSkills(root)).toEqual([
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/no-summary/SKILL.md',
        slug: 'no-summary',
        summary: 'No description in SKILL.md frontmatter.',
      },
    ]);
  });

  test('ignores SKILL.md files without frontmatter and uses folder slug', () => {
    const root = makeTempDir();
    const skillDir = join(root, '.agents/skills', 'markdown-only');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      '# No frontmatter\n\nJust markdown.\n',
    );

    expect(discoverRepoSkills(root)).toEqual([
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/markdown-only/SKILL.md',
        slug: 'markdown-only',
        summary: 'No description in SKILL.md frontmatter.',
      },
    ]);
  });
});

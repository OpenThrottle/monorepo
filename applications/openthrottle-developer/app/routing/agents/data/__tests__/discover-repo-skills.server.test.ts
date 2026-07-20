// @vitest-environment node
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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

  test('discovers agents and claude skills and sorts by layout then slug', () => {
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
      '.claude/skills',
      'monitor-ci',
      'name: monitor-ci\ndescription: Claude CI skill.',
    );

    expect(discoverRepoSkills(root)).toEqual([
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/alpha-skill/SKILL.md',
        slug: 'alpha-skill',
        source: 'external',
        summary: 'Alpha agents skill.',
      },
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/zebra-skill/SKILL.md',
        slug: 'zebra-skill',
        source: 'external',
        summary: 'Zebra agents skill.',
      },
      {
        layout: 'claude',
        repoRelativePath: '.claude/skills/monitor-ci/SKILL.md',
        slug: 'monitor-ci',
        source: 'external',
        summary: 'Claude CI skill.',
      },
    ]);
  });

  test('threads disable-model-invocation and tags from frontmatter into the entry', () => {
    const root = makeTempDir();

    writeSkill(
      root,
      '.agents/skills',
      'github-commit',
      [
        'name: github-commit',
        'description: Commit via a guarded skill.',
        'disable-model-invocation: true',
        'tags:',
        '  - git',
        '  - github',
      ].join('\n'),
    );

    const [entry] = discoverRepoSkills(root);

    expect(entry?.disableModelInvocation).toBe(true);
    expect(entry?.tags).toEqual(['git', 'github']);
  });

  test('leaves disable-model-invocation and tags undefined when frontmatter omits them', () => {
    const root = makeTempDir();

    writeSkill(
      root,
      '.agents/skills',
      'plain-skill',
      'name: plain-skill\ndescription: No flag, no tags.',
    );

    const [entry] = discoverRepoSkills(root);

    expect(entry?.disableModelInvocation).toBeUndefined();
    expect(entry?.tags).toBeUndefined();
  });

  test('derives openthrottle for an authored skill symlinked from skills/', () => {
    const root = makeTempDir();

    // Authored home: skills/<slug>, linked into .agents/skills by skill-sync.
    writeSkill(
      root,
      'skills',
      'owned-skill',
      'name: owned-skill\ndescription: We author this one.',
    );
    mkdirSync(join(root, '.agents/skills'), { recursive: true });
    symlinkSync(
      join(root, 'skills/owned-skill'),
      join(root, '.agents/skills/owned-skill'),
      'dir',
    );

    const [entry] = discoverRepoSkills(root);

    expect(entry?.slug).toBe('owned-skill');
    expect(entry?.source).toBe('openthrottle');
    expect(entry?.sourceUrl).toBeUndefined();
  });

  test('derives external with a lockfile origin URL for an installed skill', () => {
    const root = makeTempDir();

    writeSkill(
      root,
      '.agents/skills',
      'vendored-skill',
      'name: vendored-skill\ndescription: Installed via the skills CLI.',
    );
    writeFileSync(
      join(root, 'skills-lock.json'),
      JSON.stringify({
        skills: {
          'vendored-skill': {
            source: 'github/awesome-copilot',
            sourceType: 'github',
          },
        },
        version: 1,
      }),
    );

    const [entry] = discoverRepoSkills(root);

    expect(entry?.source).toBe('external');
    expect(entry?.sourceUrl).toBe('https://github.com/github/awesome-copilot');
  });

  test('derives external with no URL when the lockfile is absent', () => {
    const root = makeTempDir();

    writeSkill(
      root,
      '.agents/skills',
      'orphan-skill',
      'name: orphan-skill\ndescription: Real dir, no lockfile.',
    );

    const [entry] = discoverRepoSkills(root);

    expect(entry?.source).toBe('external');
    expect(entry?.sourceUrl).toBeUndefined();
  });

  test('ignores a source frontmatter key — provenance is layout-derived', () => {
    const root = makeTempDir();

    writeSkill(
      root,
      '.agents/skills',
      'stamped-skill',
      [
        'name: stamped-skill',
        'description: Claims to be ours in frontmatter.',
        'source: openthrottle',
      ].join('\n'),
    );

    const [entry] = discoverRepoSkills(root);

    // A real (installed) directory reads external regardless of frontmatter.
    expect(entry?.source).toBe('external');
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
        source: 'external',
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
        source: 'external',
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
        source: 'external',
        summary: 'No description in SKILL.md frontmatter.',
      },
    ]);
  });

  test('skips skill folders that do not contain SKILL.md', () => {
    const root = makeTempDir();
    const emptyFolder = join(root, '.agents/skills', 'no-skill-file');
    mkdirSync(emptyFolder, { recursive: true });
    writeSkill(
      root,
      '.agents/skills',
      'has-skill',
      'name: has-skill\ndescription: Present.',
    );

    expect(discoverRepoSkills(root)).toEqual([
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/has-skill/SKILL.md',
        slug: 'has-skill',
        source: 'external',
        summary: 'Present.',
      },
    ]);
  });

  test('dedupes symlinked claude skill when agents layout has the same slug', () => {
    const root = makeTempDir();

    writeSkill(
      root,
      '.agents/skills',
      'shared-skill',
      'name: shared-skill\ndescription: Canonical agents skill.',
    );

    const agentsSkillDir = join(root, '.agents/skills/shared-skill');
    const claudeSkillsRoot = join(root, '.claude/skills');
    mkdirSync(claudeSkillsRoot, { recursive: true });
    symlinkSync(agentsSkillDir, join(claudeSkillsRoot, 'shared-skill'));

    expect(discoverRepoSkills(root)).toEqual([
      {
        layout: 'agents',
        repoRelativePath: '.agents/skills/shared-skill/SKILL.md',
        slug: 'shared-skill',
        source: 'external',
        summary: 'Canonical agents skill.',
      },
    ]);
  });

  test('ignores non-directory entries under the skills root', () => {
    const root = makeTempDir();
    const skillsRoot = join(root, '.claude/skills');
    mkdirSync(skillsRoot, { recursive: true });
    writeFileSync(join(skillsRoot, 'README.md'), '# not a skill folder\n');
    writeSkill(
      root,
      '.claude/skills',
      'real-skill',
      'name: real-skill\ndescription: Claude skill.',
    );

    expect(discoverRepoSkills(root)).toEqual([
      {
        layout: 'claude',
        repoRelativePath: '.claude/skills/real-skill/SKILL.md',
        slug: 'real-skill',
        source: 'external',
        summary: 'Claude skill.',
      },
    ]);
  });
});

/**
 * @description Repo-relative skill paths for OpenThrottle editor configuration.
 * Keep aligned with `applications/openthrottle-developer/app/routing/agents/data/repo-skills-registry.ts`.
 */

export type RepoSkillPathLayout = 'agents' | 'cursor';

interface RepoSkillPathEntry {
  readonly layout: RepoSkillPathLayout;
  readonly repoRelativePath: string;
  readonly slug: string;
}

/**
 * @description Skill paths used when applying editor configuration to linked repos.
 */
export const OPENTHROTTLE_REPO_SKILL_PATHS: readonly RepoSkillPathEntry[] = [
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/brag-sheet/SKILL.md',
    slug: 'brag-sheet',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/create-readme/SKILL.md',
    slug: 'create-readme',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/git-commit/SKILL.md',
    slug: 'git-commit',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/grill-me/SKILL.md',
    slug: 'grill-me',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/link-workspace-packages/SKILL.md',
    slug: 'link-workspace-packages',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/monitor-ci/SKILL.md',
    slug: 'monitor-ci',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/my-pull-requests/SKILL.md',
    slug: 'my-pull-requests',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-generate/SKILL.md',
    slug: 'nx-generate',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-import/SKILL.md',
    slug: 'nx-import',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-plugins/SKILL.md',
    slug: 'nx-plugins',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-run-tasks/SKILL.md',
    slug: 'nx-run-tasks',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/secret-scanning/SKILL.md',
    slug: 'secret-scanning',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/shadcn/SKILL.md',
    slug: 'shadcn',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/link-workspace-packages/SKILL.md',
    slug: 'link-workspace-packages',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/monitor-ci/SKILL.md',
    slug: 'monitor-ci',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-generate/SKILL.md',
    slug: 'nx-generate',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-import/SKILL.md',
    slug: 'nx-import',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-plugins/SKILL.md',
    slug: 'nx-plugins',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-run-tasks/SKILL.md',
    slug: 'nx-run-tasks',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
  },
];

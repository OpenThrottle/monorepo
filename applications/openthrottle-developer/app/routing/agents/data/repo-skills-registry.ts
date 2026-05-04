/**
 * @description Canonical repo-relative paths for agent skills. `.agents/skills` is the OT/Ralph
 * convention; `.cursor/skills` mirrors a subset for Cursor IDE routing—both live in-repo.
 */
export type SkillRegistryLayout = 'agents' | 'cursor';

export interface RepoSkillEntry {
  readonly layout: SkillRegistryLayout;
  readonly repoRelativePath: string;
  readonly slug: string;
  readonly summary: string;
}

export const REPO_SKILLS_REGISTRY: readonly RepoSkillEntry[] = [
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/brag-sheet/SKILL.md',
    slug: 'brag-sheet',
    summary:
      'Impact statements and work history from sessions, git, and PRs (review prep, brag sheet).',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/create-readme/SKILL.md',
    slug: 'create-readme',
    summary: 'Author README.md files for packages and projects.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/git-commit/SKILL.md',
    slug: 'git-commit',
    summary: 'Conventional commits with staged-file intelligence.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/grill-me/SKILL.md',
    slug: 'grill-me',
    summary: 'Stress-test plans and designs via structured Q&A.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/link-workspace-packages/SKILL.md',
    slug: 'link-workspace-packages',
    summary: 'Wire workspace packages with pnpm instead of path hacks.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/monitor-ci/SKILL.md',
    slug: 'monitor-ci',
    summary: 'Nx Cloud CI monitoring and self-healing fixes.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/my-pull-requests/SKILL.md',
    slug: 'my-pull-requests',
    summary: 'List pull requests for the current repository.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-generate/SKILL.md',
    slug: 'nx-generate',
    summary: 'Nx generators and scaffolding workflow.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-import/SKILL.md',
    slug: 'nx-import',
    summary: 'Import or merge external repos into an Nx workspace.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-plugins/SKILL.md',
    slug: 'nx-plugins',
    summary: 'Discover and add Nx plugins.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-run-tasks/SKILL.md',
    slug: 'nx-run-tasks',
    summary: 'Run Nx targets (build, test, lint) correctly in this monorepo.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
    summary: 'Explore workspace structure, targets, and dependencies.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/secret-scanning/SKILL.md',
    slug: 'secret-scanning',
    summary: 'Scan content for leaked secrets and credentials.',
  },
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/shadcn/SKILL.md',
    slug: 'shadcn',
    summary: 'shadcn/ui components, registries, and styling in this repo.',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/link-workspace-packages/SKILL.md',
    slug: 'link-workspace-packages',
    summary:
      'Cursor-routed skill: link workspace packages (same topic as .agents; different path for IDE).',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/monitor-ci/SKILL.md',
    slug: 'monitor-ci',
    summary: 'Cursor-routed skill: CI monitoring in this monorepo.',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-generate/SKILL.md',
    slug: 'nx-generate',
    summary: 'Cursor-routed skill: Nx generate / scaffolding.',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-import/SKILL.md',
    slug: 'nx-import',
    summary: 'Cursor-routed skill: nx import / monorepo merges.',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-plugins/SKILL.md',
    slug: 'nx-plugins',
    summary: 'Cursor-routed skill: discover and add Nx plugins.',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-run-tasks/SKILL.md',
    slug: 'nx-run-tasks',
    summary: 'Cursor-routed skill: run Nx targets via pnpm nx.',
  },
  {
    layout: 'cursor',
    repoRelativePath: '.cursor/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
    summary: 'Cursor-routed skill: explore Nx workspace graph and config.',
  },
];

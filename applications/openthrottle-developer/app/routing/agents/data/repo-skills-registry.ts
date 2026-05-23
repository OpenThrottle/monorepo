/**
 * @description Types and helpers for repo skill entries discovered from
 * `.agents/skills` and `.cursor/skills` at request time (see
 * `discover-repo-skills.server.ts` and the `skills._index` route loader).
 *
 * Keep `OPENTHROTTLE_REPO_SKILL_PATHS` in
 * `packages/nestjs-repositories/.../openthrottle-repo-skill-paths.ts` aligned
 * when adding skills that workspace editor apply should write.
 */
export type SkillRegistryLayout = 'agents' | 'cursor';

/**
 * @description OpenThrottle-specific agent skills that must appear in discovery
 * and in `OPENTHROTTLE_REPO_SKILL_PATHS` (nestjs-repositories).
 */
export const REQUIRED_AGENTS_SKILL_SLUGS = [
  'openthrottle-generators',
  'openthrottle-stack',
  'ot-plans',
  'workflow-ralph',
] as const;

export interface RepoSkillEntry {
  readonly layout: SkillRegistryLayout;
  readonly repoRelativePath: string;
  readonly slug: string;
  readonly summary: string;
}

/**
 * @description Returns layout counts for display next to the discovered skills list.
 */
export const getRepoSkillsRegistryCounts = (
  entries: ReadonlyArray<RepoSkillEntry>,
): { readonly agents: number; readonly cursor: number } => {
  let agents = 0;
  let cursor = 0;
  for (const e of entries) {
    if (e.layout === 'cursor') {
      cursor += 1;
    } else {
      agents += 1;
    }
  }
  return { agents, cursor };
};

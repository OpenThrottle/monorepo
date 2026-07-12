/**
 * @description Types and helpers for repo skill entries discovered from
 * `.agents/skills` and `.cursor/skills` at request time (see
 * `discover-repo-skills.server.ts` and the `skills._index` route loader).
 *
 * Keep `OPENTHROTTLE_REPO_SKILL_PATHS` in
 * `packages/nestjs-repositories/.../openthrottle-repo-skill-paths.ts` aligned
 * when adding skills that workspace editor apply should write.
 */
export type SkillRegistryLayout = 'agents' | 'claude' | 'cursor' | 'opencode';

const LAYOUT_PREFERENCE: Readonly<Record<SkillRegistryLayout, number>> = {
  agents: 0,
  claude: 1,
  cursor: 2,
  opencode: 3,
};

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
  /**
   * Tri-state static frontmatter `disable-model-invocation`: `true` = auto
   * (model-initiated) invocation suppressed, `false` = explicitly enabled,
   * `undefined` = unset (frontmatter omits the key). Sourced from disk
   * frontmatter, overridden by the `projectSkills` GraphQL value when present.
   */
  readonly disableModelInvocation: boolean | undefined;
  /**
   * Resolved per-context effective `disable-model-invocation` from the
   * `skillAvailability` GraphQL surface (`environment: interactive`): `true` =
   * model auto-invocation suppressed for this context. Optional — absent when
   * the query failed/returned empty, in which case the UI falls back to the
   * static-only view (exactly today's behavior). Human `/skill` invocation is
   * never gated. See docs/monorepo/skill-availability-design.md ("Surfacing").
   */
  readonly effectiveDisableModelInvocation?: boolean;
  readonly layout: SkillRegistryLayout;
  /**
   * Decisive rung's provenance string from `skillAvailability` (closed grammar,
   * e.g. `frontmatter:true`, `posture:deny`, `tag-deny:<tag>@<ruleId>`).
   * Optional — present only alongside {@link effectiveDisableModelInvocation}.
   */
  readonly provenance?: string;
  readonly repoRelativePath: string;
  readonly slug: string;
  readonly summary: string;
  /** Static frontmatter tags; `undefined` when the frontmatter omits `tags`. */
  readonly tags: readonly string[] | undefined;
}

/**
 * @description Collapses duplicate slugs across editor layouts, preferring `.agents/skills`.
 */
export const dedupeRepoSkillEntriesBySlug = (
  entries: ReadonlyArray<RepoSkillEntry>,
): readonly RepoSkillEntry[] => {
  const bySlug = new Map<string, RepoSkillEntry>();

  for (const entry of entries) {
    const existing = bySlug.get(entry.slug);
    if (!existing) {
      bySlug.set(entry.slug, entry);
      continue;
    }

    if (LAYOUT_PREFERENCE[entry.layout] < LAYOUT_PREFERENCE[existing.layout]) {
      bySlug.set(entry.slug, entry);
    }
  }

  return [...bySlug.values()];
};

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

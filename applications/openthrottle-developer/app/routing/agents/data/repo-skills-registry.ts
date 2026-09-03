/**
 * @description Types and helpers for repo skill entries discovered from
 * `.agents/skills` (the SSOT view) at request time (see
 * `discover-repo-skills.server.ts` and the `skills._index` route loader).
 *
 * Keep `OPENTHROTTLE_REPO_SKILL_PATHS` in
 * `packages/nestjs-repositories/.../openthrottle-repo-skill-paths.ts` aligned
 * when adding skills that workspace editor apply should write.
 */
import type { SkillSource } from '@openthrottle/openthrottle-skills';

export type SkillRegistryLayout =
  'agents' | 'claude' | 'codex' | 'cursor' | 'grok' | 'opencode';

/**
 * Dedupe/sort precedence across layouts. `.agents/skills` is the canonical SSOT
 * view and always wins; the remaining entries are the per-CLI dirs each tool
 * reads (Claude Code, Codex, Cursor 2.4+, Grok Build, OpenCode all read the
 * SKILL.md standard — they differ only in scanned directory). Order after
 * `agents` is stable but not semantically ranked.
 */
const LAYOUT_PREFERENCE: Readonly<Record<SkillRegistryLayout, number>> = {
  agents: 0,
  claude: 1,
  codex: 2,
  cursor: 3,
  grok: 4,
  opencode: 5,
};

/**
 * @description OpenThrottle-specific agent skills that must appear in discovery
 * and in `OPENTHROTTLE_REPO_SKILL_PATHS` (nestjs-repositories).
 */
export const REQUIRED_AGENTS_SKILL_SLUGS = [
  'ot-generators',
  'ot-plans',
  'ot-stack',
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
  /**
   * True when the skill folder is a real directory under a scanned skills dir
   * whose slug is ABSENT from `skills-lock.json` — a skill authored in this
   * repository rather than installed into it. Lockfile absence is the whole
   * discriminator: a real directory is a vendored install only if the lockfile
   * claims it. Unlike the personal tier it IS committable — the managed
   * `.gitignore` block ignores everything under `.agents/skills` but re-includes
   * nested directories, and git classes the generated symlinks as files, so a
   * real directory survives and everyone on the team gets it. Separate from
   * {@link RepoSkillEntry.source}
   * for the same reason as {@link RepoSkillEntry.isPersonal}: that value is
   * ingested and served over GraphQL, and a custom skill still arrives as
   * `external` on the wire.
   */
  readonly isCustom?: boolean;
  /**
   * True when the skill folder resolves under the per-user personal skills root
   * (`~/.openthrottle/skills`, or `OPENTHROTTLE_PERSONAL_SKILLS_DIR`), linked in
   * by ot-skill-sync. Membership in that root is the test — a link that merely
   * escapes the repo is nobody's personal tier and stays plain external. It is
   * on disk and invokable, but it is yours alone: nobody else's checkout has
   * it, and it can never be committed. Separate from {@link RepoSkillEntry.source}
   * because that value is ingested and served over GraphQL, while the personal
   * tier is local developer tooling with no server surface.
   */
  readonly isPersonal?: boolean;
  readonly layout: SkillRegistryLayout;
  /**
   * Set when this row exists in `project_skills` but is no longer on disk
   * (ingest stamped `orphanedAt`). Absent for on-disk skills.
   */
  readonly orphanedAt?: Date | string;
  /**
   * Decisive rung's provenance string from `skillAvailability` (closed grammar,
   * e.g. `frontmatter:true`, `posture:deny`, `tag-deny:<tag>@<ruleId>`).
   * Optional — present only alongside {@link effectiveDisableModelInvocation}.
   */
  readonly provenance?: string;
  readonly repoRelativePath: string;
  readonly slug: string;
  /**
   * Derived skill provenance (never frontmatter): `openthrottle` when the
   * skill folder's real path resolves under the repo's authored `skills/`
   * tree (ot-skill-sync symlinks it into the scanned layouts), `external` for
   * lockfile-installed real directories. Overridden by the ingested
   * `projectSkills` GraphQL value when present. The personal and custom tiers
   * are overlay flags on top of this two-value enum, not members of it — see
   * {@link RepoSkillEntry.isPersonal} and {@link RepoSkillEntry.isCustom}.
   */
  readonly source: SkillSource;
  /**
   * Origin URL for external skills, derived from the repo-root
   * skills-lock.json entry; `undefined` for authored skills or when the
   * lockfile has no usable source.
   */
  readonly sourceUrl?: string;
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
 * @description Returns the count of discovered skills under the `.agents/skills`
 * SSOT view, for display next to the skills list.
 */
export const getRepoSkillsRegistryCounts = (
  entries: ReadonlyArray<RepoSkillEntry>,
): { readonly agents: number } => ({ agents: entries.length });

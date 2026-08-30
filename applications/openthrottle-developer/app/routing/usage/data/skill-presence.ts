/**
 * @description Presence classification for skill-usage leaderboard rows: does
 * the skill behind a recorded invocation still exist in this checkout?
 *
 * `discoverRepoSkills` is repo-rooted — it scans `.agents/skills`,
 * `.claude/skills`, `.codex/skills`, `.cursor/skills`, `.grok/skills` and
 * `.opencode/skills`, and deliberately excludes per-tool global dirs. A
 * plugin-namespaced third-party row (`vercel:deploy`) therefore never matches a
 * disk slug, but it is not missing — it is out of scan scope. So presence is a
 * three-member vocabulary keyed off scope AND slug match, not a boolean:
 *
 * | scope         | slug on disk | personal | presence    |
 * | ------------- | ------------ | -------- | ----------- |
 * | `ours`        | yes          | no       | `installed` |
 * | `ours`        | yes          | yes      | `personal`  |
 * | `ours`        | no           | —        | `missing`   |
 * | `third-party` | —            | —        | `external`  |
 *
 * `personal` is present-but-not-shared: the SKILL.md is on disk and invokable,
 * but it is linked in from outside the repo, so nobody else's checkout has it
 * (docs/monorepo/foreign-workspace-skill-injection.md §7). It is emphatically
 * neither `missing` (it is right there) nor `external` (it is yours, not a
 * third party's), which is exactly why it earns its own member instead of
 * being folded into either.
 *
 * Members are declared once, here. Everything downstream (labels, tooltips,
 * badge gate, link gate) is a `Record<SkillPresence, …>`, so adding a member
 * fails the build at every site that must handle it rather than silently
 * defaulting.
 */

import { SKILL_RECORD_TAGS_COPY } from '~/routing/skills/data/data.copy';
import { SKILL_USAGE_SCOPES } from '~/routing/usage/data/skill-usage-copy';

/** The finite presence vocabulary. Declared exactly once. */
export const SKILL_PRESENCES = [
  'external',
  'installed',
  'missing',
  'personal',
] as const;

/** One of the {@link SKILL_PRESENCES} members. */
export type SkillPresence = (typeof SKILL_PRESENCES)[number];

/** Named ids, so call sites never spell a member as a bare string literal. */
export const SKILL_PRESENCE: Record<Uppercase<SkillPresence>, SkillPresence> = {
  EXTERNAL: 'external',
  INSTALLED: 'installed',
  MISSING: 'missing',
  PERSONAL: 'personal',
};

/**
 * Badge copy per member. `missing` reuses the exact
 * {@link SKILL_RECORD_TAGS_COPY.orphanBadge} wording so this surface and the
 * DB-orphan badge in `SkillsTable` never drift apart. The two states that carry
 * no badge still declare a label rather than being omitted — see
 * {@link SKILL_PRESENCE_BADGED} for the gate that decides what renders.
 */
export const SKILL_PRESENCE_LABELS: Record<SkillPresence, string> = {
  external: `Third-party`,
  installed: `On disk`,
  missing: SKILL_RECORD_TAGS_COPY.orphanBadge,
  personal: `Personal`,
};

/** Hover copy explaining what each presence state means for the reader. */
export const SKILL_PRESENCE_TOOLTIPS: Record<SkillPresence, string> = {
  external: `Plugin-namespaced or otherwise outside the repo skill dirs, so it is not scanned for on disk.`,
  installed: `A SKILL.md for this skill exists in this checkout.`,
  missing: `This skill has recorded usage but no SKILL.md in this checkout — it was removed, renamed, or moved. The counts are kept as history.`,
  personal: `On disk and invokable, but linked in from your personal skills directory outside the repo — nobody else's checkout has it.`,
};

/**
 * Which members render a presence badge next to the skill name. `missing` and
 * `personal` are worth calling out — one because the skill is gone, the other
 * because the row is not reproducible for anybody else reading the same
 * leaderboard. `installed` is the unremarkable default and `external` is
 * already conveyed by the Scope column.
 */
export const SKILL_PRESENCE_BADGED: Record<SkillPresence, boolean> = {
  external: false,
  installed: false,
  missing: true,
  personal: true,
};

/**
 * Which members resolve to a `/skills/$slug` detail page. Derived from presence
 * rather than from a separate slug set, so linkability and the badge can never
 * disagree about the same row.
 */
export const SKILL_PRESENCE_LINKABLE: Record<SkillPresence, boolean> = {
  external: false,
  installed: true,
  missing: false,
  personal: true,
};

/**
 * Classify one leaderboard row. A `third-party` row is `external` regardless of
 * whether its name coincidentally matches a disk slug — scope wins, because the
 * scan never covered it in the first place.
 *
 * `personalSlugs` is a subset of `presentSlugs`; it defaults to empty so a
 * caller without the discovery entries to hand degrades to `installed`, which
 * is still true — just less specific — rather than to a wrong answer.
 */
export const classifySkillUsagePresence = (
  row: { readonly scope: string; readonly skillName: string },
  presentSlugs: ReadonlySet<string>,
  personalSlugs: ReadonlySet<string> = new Set(),
): SkillPresence => {
  if (row.scope === SKILL_USAGE_SCOPES.THIRD_PARTY) {
    return SKILL_PRESENCE.EXTERNAL;
  }

  if (!presentSlugs.has(row.skillName)) {
    return SKILL_PRESENCE.MISSING;
  }

  return personalSlugs.has(row.skillName)
    ? SKILL_PRESENCE.PERSONAL
    : SKILL_PRESENCE.INSTALLED;
};

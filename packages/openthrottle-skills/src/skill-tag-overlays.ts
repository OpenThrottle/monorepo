import { z } from 'zod';

import { AGENT_ASSET_SLUG_PATTERN } from './schemas/agent-asset-frontmatter.schemas.ts';

/**
 * @description Filename of the repo-root skill-tag overlay file. It is the
 * monorepo's own default-tag *attachment* source: OT's `.agents/skills/`
 * SKILL.md bodies carry no `tags` frontmatter, so this file supplies the tags
 * the ingest pipe projects into `project_skills`. It is deliberately a repo-root
 * sibling of `skills-lock.json` (NOT under `.agents/`), so vendored skills pulled
 * from upstream via skills.sh stay byte-identical to their source and their tags
 * survive re-installs. External workspace repos keep declaring tags inline in
 * frontmatter; this file is monorepo-local. See docs/monorepo/skill-availability-design.md.
 * @public
 */
export const SKILL_TAG_OVERLAYS_FILENAME = 'skill-tag-overlays.json';

const overlayTagSchema = z
  .string()
  .trim()
  .min(1)
  .regex(AGENT_ASSET_SLUG_PATTERN, 'tags must be kebab-case slugs');

const skillTagOverlayEntrySchema = z
  .object({
    tags: z.array(overlayTagSchema),
  })
  .strict();

/**
 * @description Zod schema for the repo-root skill-tag overlay file. `.strict()`
 * at both levels so a typo (stray key, misspelled `tags`) fails loudly rather
 * than silently dropping an overlay. Overlay keys are kebab-case skill slugs;
 * their presence/absence is enforced against the on-disk corpus by
 * scripts/check-skill-tag-vocabulary.ts (coverage is a correctness property).
 * @public
 */
export const skillTagOverlayFileSchema = z
  .object({
    overlays: z.record(
      z
        .string()
        .regex(
          AGENT_ASSET_SLUG_PATTERN,
          'overlay keys must be kebab-case skill slugs',
        ),
      skillTagOverlayEntrySchema,
    ),
    version: z.literal(1),
  })
  .strict();

/** @public */
export type SkillTagOverlayEntry = z.infer<typeof skillTagOverlayEntrySchema>;

/** @public */
export type SkillTagOverlayFile = z.infer<typeof skillTagOverlayFileSchema>;

/** The per-slug overlay map: `overlays` from a parsed {@link SkillTagOverlayFile}. */
export type SkillTagOverlayMap = SkillTagOverlayFile['overlays'];

/**
 * @description Parses and validates the repo-root skill-tag overlay JSON. Pure —
 * no I/O; callers read the file. Throws (JSON syntax) or a ZodError (schema)
 * with actionable messages on malformed input.
 * @public
 */
export const parseSkillTagOverlayFile = (
  fileContent: string,
): SkillTagOverlayFile => {
  const parsed: unknown = JSON.parse(fileContent);
  return skillTagOverlayFileSchema.parse(parsed);
};

/**
 * @description Merges a skill's frontmatter `tags` with its overlay `tags` into
 * the effective tag list: an order-preserving union (frontmatter tags first,
 * then overlay tags not already present), deduped. Order-preserving — not sorted
 * — so the projection stays byte-stable for a monorepo whose overlay arrays are
 * already alphabetized and whose frontmatter carries no tags. Pure.
 * @public
 */
export const mergeSkillTags = (
  frontmatterTags: readonly string[] | undefined,
  overlayTags: readonly string[] | undefined,
): readonly string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const tag of [...(frontmatterTags ?? []), ...(overlayTags ?? [])]) {
    if (!seen.has(tag)) {
      seen.add(tag);
      merged.push(tag);
    }
  }

  return merged;
};

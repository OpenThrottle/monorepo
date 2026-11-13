export interface SkillTagVocabularyEntry {
  readonly path: string;
  readonly tags: readonly string[] | undefined;
}

export interface SkillTagVocabularyViolation {
  readonly path: string;
  readonly tag: string;
}

/**
 * @description Pure lookup used by the CI-only committed-vocabulary enum check
 * (this monorepo's own `.agents/skills/` corpus only — see
 * docs/monorepo/skill-availability-design.md, "Tags" section). Zero tags on an
 * entry is not a violation. Kept separate from `skillFrontmatterSchema`, which
 * stays permissive for ingest of external workspace repos.
 * @public
 */
export const findUnknownSkillTags = (
  entries: readonly SkillTagVocabularyEntry[],
  vocabulary: readonly string[],
): readonly SkillTagVocabularyViolation[] => {
  const vocabularySet = new Set(vocabulary);
  const violations: SkillTagVocabularyViolation[] = [];

  for (const entry of entries) {
    for (const tag of entry.tags ?? []) {
      if (!vocabularySet.has(tag)) {
        violations.push({ path: entry.path, tag });
      }
    }
  }

  return violations;
};

/**
 * @description Merges two tag lists into an order-preserving union (first list
 * first, then tags from the second that are not already present), deduped. Used
 * when combining SKILL.md frontmatter tags with extra tags (e.g. record-owned
 * tags on a connected workspace). Pure. This monorepo does not attach tags via
 * an overlay file — project_skills.tags are record-owned.
 * @public
 */
export const mergeSkillTags = (
  frontmatterTags: readonly string[] | undefined,
  extraTags: readonly string[] | undefined,
): readonly string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const tag of [...(frontmatterTags ?? []), ...(extraTags ?? [])]) {
    if (!seen.has(tag)) {
      seen.add(tag);
      merged.push(tag);
    }
  }

  return merged;
};

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

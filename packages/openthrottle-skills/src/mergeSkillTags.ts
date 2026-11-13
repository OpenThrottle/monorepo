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

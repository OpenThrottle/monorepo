/**
 * @description Discriminants of `SkillTagWriteResult`, the outcome of
 * `SkillTagsRepository.addTag` and `SkillTagsRepository.renameTag`.
 * @public
 */
export const SKILL_TAG_WRITE_RESULT_KIND = {
  CONFLICT: 'conflict',
  OK: 'ok',
} as const;

/**
 * @description Discriminants of `SkillTagWriteResult`, the outcome of
 * `SkillTagsRepository.addTag` and `SkillTagsRepository.renameTag`.
 * @public
 */
export const SKILL_TAG_WRITE_RESULT_KIND = {
  CONFLICT: 'conflict',
  OK: 'ok',
} as const;

export type SkillTagWriteResultKindKey =
  keyof typeof SKILL_TAG_WRITE_RESULT_KIND;
export type SkillTagWriteResultKindValue =
  (typeof SKILL_TAG_WRITE_RESULT_KIND)[SkillTagWriteResultKindKey];

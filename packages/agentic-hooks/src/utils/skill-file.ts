/**
 * Tool-neutral recognition of a skill invocation made by reading its
 * `SKILL.md`. Producers with no dedicated skill tool load a skill by reading
 * the file, so the skill name is the file's parent directory.
 */

/**
 * The `invocation_path` for a skill observed as a read of its `SKILL.md`. It is
 * a weaker signal than a dedicated skill tool call (an agent editing a skill
 * reads it too), so it is recorded under its own path rather than reusing
 * `skill_tool`, keeping the producers' data separable.
 *
 * @public
 */
export const SKILL_READ_INVOCATION_PATH = 'skill_read';

/** Matches `<anything>/<skill-name>/SKILL.md`, capturing the skill name. */
const SKILL_FILE_PATTERN = /(?:^|\/)([^/]+)\/SKILL\.md$/;

/**
 * The skill name a `SKILL.md` path names (its parent directory), or null when
 * the path is not a `SKILL.md`. Accepts relative and absolute paths, and
 * Windows separators.
 *
 * @public
 */
export const skillNameFromSkillFilePath = (filePath: string): string | null => {
  const match = SKILL_FILE_PATTERN.exec(filePath.split('\\').join('/'));
  return match?.[1] ?? null;
};

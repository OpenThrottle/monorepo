/** @public Refusal reasons surfaced to the caller as a BadRequest message. */
export const CUSTOM_PROMPT_WRITE_REFUSAL = {
  absolutePath: `Refused: filePath must be relative to the workspace root, not an absolute path.`,
  emptyPath: `Refused: filePath is empty.`,
  escapesWorkspace: `Refused: filePath resolves outside the workspace root.`,
  parentSegment: `Refused: filePath must not contain a ".." segment.`,
  skillContent: `Refused: SKILL.md is written only through the skills surface, which enforces skill provenance and frontmatter validation.`,
  unresolvableRoot: `Refused: the workspace root could not be resolved on disk.`,
} as const;

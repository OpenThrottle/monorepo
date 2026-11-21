/** @public Refusal reasons surfaced to the caller as a BadRequest message. */
export const CUSTOM_PROMPT_WRITE_REFUSAL = {
  absolutePath: `Refused: filePath must be relative to the workspace root, not an absolute path.`,
  emptyPath: `Refused: filePath is empty.`,
  escapesWorkspace: `Refused: filePath resolves outside the workspace root.`,
  parentSegment: `Refused: filePath must not contain a ".." segment.`,
  skillContent: `Refused: SKILL.md is written only through the skills surface, which enforces skill provenance and frontmatter validation.`,
  unresolvableRoot: `Refused: the workspace root could not be resolved on disk.`,
} as const;

/** @public Refusals for a prompt write the caller may not make, surfaced as a Forbidden message. */
export const CUSTOM_PROMPT_ACCESS_REFUSAL = {
  systemPromptReadOnly: `System prompts are read-only: they are owned by the agent-asset ingest and cannot be edited, deleted or restored through the API. Create your own prompt to override one.`,
  userRequired: `Writing a custom prompt requires a user identity: a service account must be linked to the user it acts as.`,
} as const;

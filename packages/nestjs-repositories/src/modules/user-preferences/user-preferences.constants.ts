/**
 * @description Reasons {@link validateUserPreferencesPatch} rejects a patch. As-const object, not
 * an enum (repo rule).
 */
export const USER_PREFERENCES_ERROR_REASONS = {
  agentModelRequired: 'AGENT_MODEL_REQUIRED',
  invalidAgentBackend: 'INVALID_AGENT_BACKEND',
  invalidAgentEffort: 'INVALID_AGENT_EFFORT',
  invalidEditor: 'INVALID_EDITOR',
} as const;

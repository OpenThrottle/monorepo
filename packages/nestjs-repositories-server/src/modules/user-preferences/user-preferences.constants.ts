/**
 * @description Reasons `validateUserPreferencesPatch` rejects a patch. As-const object, not an
 * enum (repo rule).
 * @public
 */
export const USER_PREFERENCES_ERROR_REASONS = {
  agentModelRequired: 'AGENT_MODEL_REQUIRED',
  invalidAgentDriver: 'INVALID_AGENT_DRIVER',
  invalidAgentEffort: 'INVALID_AGENT_EFFORT',
  invalidEditor: 'INVALID_EDITOR',
} as const;

export type UserPreferencesErrorReasonsKey =
  keyof typeof USER_PREFERENCES_ERROR_REASONS;
export type UserPreferencesErrorReasonsValue =
  (typeof USER_PREFERENCES_ERROR_REASONS)[UserPreferencesErrorReasonsKey];

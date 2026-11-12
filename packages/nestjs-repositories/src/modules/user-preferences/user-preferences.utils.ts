/**
 * @description Pure validation and read-narrowing for user preferences. The allowlists are code,
 * not tables (no catalog FK, like migration 092): editors from {@link isWorkspaceEditorId}, driver
 * ids from the drivers registry, efforts from the conversation reasoning-effort list.
 */

import { toConversationReasoningEffort } from '@openthrottle/openthrottle-agentic-utils';
import { isDriverId } from '@openthrottle/openthrottle-drivers';

import type { WorkspaceEditorId } from '../workspace-settings/workspace-settings.types.ts';
import { isWorkspaceEditorId } from '../workspace-settings/workspace-settings.utils.ts';
import { USER_PREFERENCES_ERROR_REASONS } from './user-preferences.constants.ts';
import type { UserPreferences } from './user-preferences.entity.ts';
import type {
  UpdateUserPreferencesPatch,
  UserPreferencesAgent,
  UserPreferencesAgentInput,
  UserPreferencesData,
  UserPreferencesError,
  UserPreferencesErrorReason,
  UserPreferencesValidationResult,
} from './user-preferences.types.ts';

type AgentValidation =
  | { readonly agent: UserPreferencesAgent; readonly ok: true }
  | UserPreferencesError;

/**
 * @description Builds a rejected result.
 */
const fail = (
  reason: UserPreferencesErrorReason,
  message: string,
): UserPreferencesError => {
  return { message, ok: false, reason };
};

/**
 * @description A stored editor id, or NULL when it is absent or no longer known.
 */
const toEditorOrNull = (value: string | null): WorkspaceEditorId | null => {
  if (value === null || !isWorkspaceEditorId(value)) {
    return null;
  }
  return value;
};

/**
 * @description Validates a non-null default-agent input.
 */
const validateAgent = (input: UserPreferencesAgentInput): AgentValidation => {
  if (!isDriverId(input.backend)) {
    return fail(
      USER_PREFERENCES_ERROR_REASONS.invalidAgentBackend,
      `Unknown agent backend "${input.backend}".`,
    );
  }
  if (input.model.trim().length === 0) {
    return fail(
      USER_PREFERENCES_ERROR_REASONS.agentModelRequired,
      `A default agent needs both a backend and a model.`,
    );
  }
  if (input.effort === null) {
    return {
      agent: { backend: input.backend, effort: null, model: input.model },
      ok: true,
    };
  }
  const effort = toConversationReasoningEffort(input.effort);
  if (effort === undefined) {
    return fail(
      USER_PREFERENCES_ERROR_REASONS.invalidAgentEffort,
      `Unknown reasoning effort "${input.effort}".`,
    );
  }
  return {
    agent: { backend: input.backend, effort, model: input.model },
    ok: true,
  };
};

/**
 * @description Validates a patch without touching the database. `undefined` keys pass through as
 * "leave unchanged" and `null` as "clear"; any other value must be in its allowlist.
 */
export const validateUserPreferencesPatch = (
  patch: UpdateUserPreferencesPatch,
): UserPreferencesValidationResult => {
  const { defaultAgent, defaultEditor } = patch;

  if (
    defaultEditor !== undefined &&
    defaultEditor !== null &&
    !isWorkspaceEditorId(defaultEditor)
  ) {
    return fail(
      USER_PREFERENCES_ERROR_REASONS.invalidEditor,
      `Unknown editor "${defaultEditor}".`,
    );
  }

  if (defaultAgent === undefined || defaultAgent === null) {
    return { ok: true, patch: { defaultAgent, defaultEditor } };
  }

  const agent = validateAgent(defaultAgent);
  if (!agent.ok) {
    return agent;
  }
  return { ok: true, patch: { defaultAgent: agent.agent, defaultEditor } };
};

/**
 * @description The all-NULL preferences a user without a row has. Never persisted.
 */
export const emptyUserPreferences = (userId: string): UserPreferencesData => {
  return { defaultAgent: null, defaultEditor: null, userId };
};

/**
 * @description Narrows a stored row to {@link UserPreferencesData}. A value that no longer passes
 * its allowlist (an editor or driver removed from code, an unknown effort) reads as NULL — it is
 * ignored, never deleted. Whether the agent is enabled for the user is the caller's check.
 */
export const toUserPreferencesData = (
  row: UserPreferences,
): UserPreferencesData => {
  const { defaultAgentBackend, defaultAgentModel, userId } = row;
  const defaultEditor = toEditorOrNull(row.defaultEditor);

  if (
    defaultAgentBackend === null ||
    defaultAgentModel === null ||
    !isDriverId(defaultAgentBackend)
  ) {
    return { defaultAgent: null, defaultEditor, userId };
  }

  const effort = toConversationReasoningEffort(row.defaultAgentEffort) ?? null;
  return {
    defaultAgent: {
      backend: defaultAgentBackend,
      effort,
      model: defaultAgentModel,
    },
    defaultEditor,
    userId,
  };
};

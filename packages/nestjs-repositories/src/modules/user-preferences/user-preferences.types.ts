import type { ConversationReasoningEffort } from '@openthrottle/openthrottle-agentic-utils';

import type { WorkspaceEditorId } from '../workspace-settings/workspace-settings.types.ts';
import type { USER_PREFERENCES_ERROR_REASONS } from './user-preferences.constants.ts';

/**
 * @description A validated default agent. Backend and model always travel together, so a
 * half-set agent cannot be represented; `effort` NULL means the backend's own default.
 */
export interface UserPreferencesAgent {
  readonly backend: string;
  readonly effort: ConversationReasoningEffort | null;
  readonly model: string;
}

/**
 * @description A user's preferences as the rest of the server sees them. A missing row reads as
 * every preference NULL (system default).
 */
export interface UserPreferencesData {
  readonly defaultAgent: UserPreferencesAgent | null;
  readonly defaultEditor: WorkspaceEditorId | null;
  readonly userId: string;
}

/**
 * @description Untrusted default-agent input (e.g. from GraphQL), validated by the service.
 */
export interface UserPreferencesAgentInput {
  readonly backend: string;
  readonly effort: string | null;
  readonly model: string;
}

/**
 * @description A partial update. Optional on purpose — this is a patch: an absent (`undefined`)
 * key leaves that preference unchanged, and `null` clears it back to the system default.
 */
export interface UpdateUserPreferencesPatch {
  readonly defaultAgent?: UserPreferencesAgentInput | null;
  readonly defaultEditor?: string | null;
}

/**
 * @description A patch whose values have all passed validation. `undefined` = leave unchanged.
 */
export interface ValidatedUserPreferencesPatch {
  readonly defaultAgent: UserPreferencesAgent | null | undefined;
  readonly defaultEditor: WorkspaceEditorId | null | undefined;
}

/** @description One of the {@link USER_PREFERENCES_ERROR_REASONS} values. */
export type UserPreferencesErrorReason =
  (typeof USER_PREFERENCES_ERROR_REASONS)[keyof typeof USER_PREFERENCES_ERROR_REASONS];

/** @description Why a patch was rejected. */
export interface UserPreferencesError {
  readonly message: string;
  readonly ok: false;
  readonly reason: UserPreferencesErrorReason;
}

/** @description Outcome of validating an {@link UpdateUserPreferencesPatch}. */
export type UserPreferencesValidationResult =
  | { readonly ok: true; readonly patch: ValidatedUserPreferencesPatch }
  | UserPreferencesError;

/** @description Outcome of {@link UserPreferencesService.update}. */
export type UpdateUserPreferencesResult =
  | { readonly ok: true; readonly preferences: UserPreferencesData }
  | UserPreferencesError;

import type { ConversationReasoningEffort } from '@openthrottle/openthrottle-agentic-utils';
import type { Mock } from 'vitest';

import type { WorkspaceEditorId } from '../user-workspace-settings/user-workspace-settings.types.ts';
import type { USER_PREFERENCES_ERROR_REASONS } from './user-preferences.constants.ts';
import type { UserPreferences } from './user-preferences.entity.ts';
import type { UserPreferencesRepository } from './user-preferences.repository.ts';

/**
 * @description A validated default agent. Driver and model always travel together, so a
 * half-set agent cannot be represented; `effort` NULL means the driver's own default.
 * @public
 */
export interface UserPreferencesAgent {
  readonly driver: string;
  readonly effort: ConversationReasoningEffort | null;
  readonly model: string;
}

/**
 * @description A user's preferences as the rest of the server sees them. A missing row reads as
 * every preference NULL (system default).
 * @public
 */
export interface UserPreferencesData {
  readonly defaultAgent: UserPreferencesAgent | null;
  readonly defaultEditor: WorkspaceEditorId | null;
  readonly userId: string;
}

/**
 * @description Untrusted default-agent input (e.g. from GraphQL), validated by the repository.
 * @public
 */
export interface UserPreferencesAgentInput {
  readonly driver: string;
  readonly effort: string | null;
  readonly model: string;
}

/**
 * @description A partial update. Optional on purpose — this is a patch: an absent (`undefined`)
 * key leaves that preference unchanged, and `null` clears it back to the system default.
 * @public
 */
export interface UpdateUserPreferencesPatch {
  readonly defaultAgent?: UserPreferencesAgentInput | null;
  readonly defaultEditor?: string | null;
}

/**
 * @description A patch whose values have all passed validation. `undefined` = leave unchanged.
 * @public
 */
export interface ValidatedUserPreferencesPatch {
  readonly defaultAgent: UserPreferencesAgent | null | undefined;
  readonly defaultEditor: WorkspaceEditorId | null | undefined;
}

/**
 * @description One of the {@link USER_PREFERENCES_ERROR_REASONS} values.
 * @public
 */
export type UserPreferencesErrorReason =
  (typeof USER_PREFERENCES_ERROR_REASONS)[keyof typeof USER_PREFERENCES_ERROR_REASONS];

/**
 * @description Why a patch was rejected.
 * @public
 */
export interface UserPreferencesError {
  readonly message: string;
  readonly ok: false;
  readonly reason: UserPreferencesErrorReason;
}

/** @description Outcome of validating an {@link UpdateUserPreferencesPatch}. */
export type UserPreferencesValidationResult =
  | { readonly ok: true; readonly patch: ValidatedUserPreferencesPatch }
  | UserPreferencesError;

/** @description Outcome of {@link UserPreferencesRepository.update}. */
export type UpdateUserPreferencesResult =
  | { readonly ok: true; readonly preferences: UserPreferencesData }
  | UserPreferencesError;

/**
 * @description Scalar/column fields of {@link UserPreferences} (no relations).
 * @public
 */
export type UserPreferencesRow = Pick<
  UserPreferences,
  | 'createdAt'
  | 'defaultAgentDriver'
  | 'defaultAgentEffort'
  | 'defaultAgentModel'
  | 'defaultEditor'
  | 'updatedAt'
  | 'userId'
>;

/**
 * @description Every public method of {@link UserPreferencesRepository}, so the mock cannot
 * drift from it.
 * @public
 */
export type UserPreferencesRepositoryMethod = 'getForUser' | 'update';

/**
 * @description A {@link UserPreferencesRepository} mock: one `Mock` per method.
 * @public
 */
export type UserPreferencesRepositoryMock = {
  readonly [TMethod in UserPreferencesRepositoryMethod]: Mock<
    UserPreferencesRepository[TMethod]
  >;
};

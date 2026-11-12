/**
 * @description Maps between the GraphQL user-preferences types and the
 * {@link UserPreferencesService} data/patch shapes.
 */

import type {
  UpdateUserPreferencesPatch,
  UserPreferencesAgent,
  UserPreferencesAgentInput as UserPreferencesAgentPatch,
  UserPreferencesData,
  UserPreferencesError,
} from '@openthrottle/nestjs-repositories';
import { GraphQLError } from 'graphql';

import { toWorkspaceEditorIdEnum } from '../workspace-settings/user-workspace-profile.mapper.ts';
import type {
  UpdateUserPreferencesInput,
  UserPreferencesAgentInput,
} from './user-preferences.input.ts';
import type {
  UserPreferencesAgentObject,
  UserPreferencesObject,
} from './user-preferences.object.ts';

const toUserPreferencesAgentObject = (
  agent: UserPreferencesAgent | null,
): UserPreferencesAgentObject | null => {
  if (agent === null) {
    return null;
  }
  return { backend: agent.backend, effort: agent.effort, model: agent.model };
};

const toUserPreferencesAgentPatch = (
  agent: UserPreferencesAgentInput | null,
): UserPreferencesAgentPatch | null => {
  if (agent === null) {
    return null;
  }
  return {
    backend: agent.backend,
    effort: agent.effort ?? null,
    model: agent.model,
  };
};

/**
 * @description Converts the service's preferences value to the GraphQL object.
 */
export const toUserPreferencesObject = (
  data: UserPreferencesData,
): UserPreferencesObject => {
  const { defaultAgent, defaultEditor } = data;

  return {
    defaultAgent: toUserPreferencesAgentObject(defaultAgent),
    defaultEditor:
      defaultEditor === null ? null : toWorkspaceEditorIdEnum(defaultEditor),
  };
};

/**
 * @description Converts the GraphQL input to a service patch, keeping the
 * omitted (`undefined` = unchanged) vs `null` (= clear) distinction intact.
 */
export const toUpdateUserPreferencesPatch = (
  input: UpdateUserPreferencesInput,
): UpdateUserPreferencesPatch => {
  const { defaultAgent, defaultEditor } = input;
  const patch: {
    defaultAgent?: UserPreferencesAgentPatch | null;
    defaultEditor?: string | null;
  } = {};

  if (defaultEditor !== undefined) {
    patch.defaultEditor = defaultEditor;
  }
  if (defaultAgent !== undefined) {
    patch.defaultAgent = toUserPreferencesAgentPatch(defaultAgent);
  }

  return patch;
};

/**
 * @description A rejected patch as an ordinary GraphQL error (HTTP 200, `errors[]`) with
 * `extensions.code = 'BAD_USER_INPUT'` and the service's `reason`, so the client can tell
 * which field was invalid.
 */
export const toUserPreferencesGraphqlError = (
  error: UserPreferencesError,
): GraphQLError => {
  return new GraphQLError(error.message, {
    extensions: { code: 'BAD_USER_INPUT', reason: error.reason },
  });
};

import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';

import type { Route } from '@/app/routes/+types/settings.preferences';
import type { UpdateUserPreferencesInput } from '~/__generated__/graphql';
import { UpdateUserPreferencesDocument } from '~/__generated__/graphql';
import {
  UpdateUserPreferencesInputSchema,
  UserPreferencesAgentInputSchema,
} from '~/__generated__/schemas';
import type {
  PreferencesActionResult,
  PreferencesIntent,
} from '~/routing/settings/data/data.preferences';
import { PREFERENCES_INTENTS } from '~/routing/settings/data/data.preferences';

const submitPatch = async (
  args: Route.ActionArgs,
  intent: PreferencesIntent,
  input: UpdateUserPreferencesInput,
): Promise<PreferencesActionResult> => {
  try {
    await executeGraphqlWithAuth(args.request, UpdateUserPreferencesDocument, {
      input,
    });
    return { intent, ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save preferences.';
    return { error: message, intent };
  }
};

/**
 * @description Saves the default editor. A blank `defaultEditor` (the "System
 * default" option) is an explicit null, which clears the preference.
 */
export const saveDefaultEditor = async (
  args: Route.ActionArgs,
  formData: FormData,
): Promise<PreferencesActionResult> => {
  const intent = PREFERENCES_INTENTS.saveDefaultEditor;
  const parsed = parseFormData(
    formData,
    UpdateUserPreferencesInputSchema().pick({ defaultEditor: true }),
  );
  if (!parsed.success) {
    return { error: parsed.error, intent };
  }

  return submitPatch(args, intent, {
    defaultEditor: parsed.data.defaultEditor ?? null,
  });
};

/**
 * @description Saves the default agent. Backend and model are required together;
 * a blank effort is stored as null (the agent's own default).
 */
export const saveDefaultAgent = async (
  args: Route.ActionArgs,
  formData: FormData,
): Promise<PreferencesActionResult> => {
  const intent = PREFERENCES_INTENTS.saveDefaultAgent;
  const parsed = parseFormData(formData, UserPreferencesAgentInputSchema());
  if (!parsed.success) {
    return { error: parsed.error, intent };
  }

  return submitPatch(args, intent, {
    defaultAgent: {
      backend: parsed.data.backend,
      effort: parsed.data.effort ?? null,
      model: parsed.data.model,
    },
  });
};

/**
 * @description Clears the default agent so the system default applies again.
 */
export const clearDefaultAgent = async (
  args: Route.ActionArgs,
): Promise<PreferencesActionResult> => {
  return submitPatch(args, PREFERENCES_INTENTS.clearDefaultAgent, {
    defaultAgent: null,
  });
};

import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import type { ChatToolbarState } from '~/routing/home/data/atom.chat-toolbar';
import type { RepositoryOption } from '~/routing/home/data/models.server';
import { capabilitiesForChatOption } from '~/routing/home/utils/chat-capabilities';
import { decodeChatOption } from '~/routing/home/utils/chat-model-option';

/**
 * Current loader-derived option lists the persisted selections are validated
 * against. `personas` is the list the toolbar actually renders (registry
 * personas, or the mock fallback), so a reconciled `personaId` always maps to a
 * visible option.
 */
export interface ReconcileChatToolbarOptions {
  readonly models: readonly ChatModelOption[];
  readonly personas: readonly ChatPersonaOption[];
  readonly repositories: readonly RepositoryOption[];
}

/**
 * @description Derive the *effective* toolbar selections from the persisted
 * blob and the current loader data. PURE and derive-only: it never mutates its
 * input and never writes back to storage — the stored blob only changes when the
 * user actively changes a control. This keeps a transient discovery gap (e.g. a
 * momentarily-down local endpoint) from clobbering a saved pick; the value
 * re-resolves on the next reload once rediscovered.
 *
 * Rules:
 * - `modelId`: kept when it exact-matches a current model id (the encoded
 *   `baseUrl::model` or bare CLI token from {@link decodeChatOption}); otherwise
 *   falls back to the first model. No name/baseURL re-resolution (deferred to V2).
 * - `personaId` / `repositoryId`: kept when still present in the current lists,
 *   else the first available (or undefined when the list is empty).
 * - `reasoning` / `serviceTier` / `permissionMode`: re-gated against the
 *   effective backend's {@link capabilitiesForChatOption}; a value the backend
 *   no longer permits is cleared.
 * - `repositoryId` is also cleared when the effective backend does not run in a
 *   repository (`requiresRepository === false`), since the checkout control is
 *   hidden for those backends.
 */
export function reconcileChatToolbarState(
  persisted: ChatToolbarState,
  options: ReconcileChatToolbarOptions,
): ChatToolbarState {
  const { models, personas, repositories } = options;

  const modelId =
    persisted.modelId != null &&
    models.some((model) => model.id === persisted.modelId)
      ? persisted.modelId
      : models[0]?.id;

  const personaId =
    persisted.personaId != null &&
    personas.some((persona) => persona.id === persisted.personaId)
      ? persisted.personaId
      : personas[0]?.id;

  const capabilities = capabilitiesForChatOption(
    modelId != null ? decodeChatOption(modelId) : null,
  );

  const repositoryId = !capabilities.requiresRepository
    ? undefined
    : persisted.repositoryId != null &&
        repositories.some(
          (repository) => repository.id === persisted.repositoryId,
        )
      ? persisted.repositoryId
      : repositories[0]?.id;

  const permissionMode =
    persisted.permissionMode != null &&
    capabilities.permissionModes.includes(persisted.permissionMode)
      ? persisted.permissionMode
      : undefined;

  const reasoning =
    persisted.reasoning != null &&
    capabilities.reasoningLevels.includes(persisted.reasoning)
      ? persisted.reasoning
      : undefined;

  const serviceTier =
    persisted.serviceTier != null &&
    capabilities.serviceTiers.includes(persisted.serviceTier)
      ? persisted.serviceTier
      : undefined;

  return {
    mode: persisted.mode,
    modelId,
    permissionMode,
    personaId,
    reasoning,
    repositoryId,
    serviceTier,
    version: persisted.version,
  };
}

import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import type { ChatToolbarState } from './atom.chat-toolbar';
import { capabilitiesForChatOption } from './chat-capabilities';
import { decodeChatOption } from './chat-model-option';

/**
 * Minimal repository shape the reconciler matches persisted selections against —
 * only the `id` is needed. Any richer app-side repository option (e.g.
 * `{ id, displayName }`) is structurally assignable.
 * @public
 */
export interface ReconcileRepositoryOption {
  readonly id: string;
}

/**
 * Current loader-derived option lists the persisted selections are validated
 * against. `personas` is the list the toolbar actually renders (registry
 * personas, or the mock fallback), so a reconciled `personaId` always maps to a
 * visible option.
 * @public
 */
export interface ReconcileChatToolbarOptions {
  readonly models: readonly ChatModelOption[];
  readonly personas: readonly ChatPersonaOption[];
  readonly repositories: readonly ReconcileRepositoryOption[];
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
 * - `reasoning` / `serviceTier` / `permissionMode`: resolved as the effective
 *   backend's `perBackend` override (keyed by `decodeChatOption(modelId).backend`)
 *   falling back to the top-level global, THEN re-gated against the effective
 *   backend's {@link capabilitiesForChatOption}; a value the backend no longer
 *   permits is cleared. `perBackend` itself passes through unchanged (derive-only).
 * - `repositoryId` is also cleared when the effective backend does not run in a
 *   repository (`requiresRepository === false`), since the checkout control is
 *   hidden for those backends.
 * @public
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

  const decoded = modelId != null ? decodeChatOption(modelId) : null;
  const capabilities = capabilitiesForChatOption(decoded);

  const repositoryId = !capabilities.requiresRepository
    ? undefined
    : persisted.repositoryId != null &&
        repositories.some(
          (repository) => repository.id === persisted.repositoryId,
        )
      ? persisted.repositoryId
      : repositories[0]?.id;

  // Per-backend override (keyed by the effective backend token) layered over the
  // global fallback, then capability-gated against the effective backend.
  const backendPrefs =
    decoded != null ? persisted.perBackend[decoded.backend] : undefined;

  const effectivePermissionMode =
    backendPrefs?.permissionMode ?? persisted.permissionMode;
  const permissionMode =
    effectivePermissionMode != null &&
    capabilities.permissionModes.includes(effectivePermissionMode)
      ? effectivePermissionMode
      : undefined;

  const effectiveReasoning = backendPrefs?.reasoning ?? persisted.reasoning;
  const reasoning =
    effectiveReasoning != null &&
    capabilities.reasoningLevels.includes(effectiveReasoning)
      ? effectiveReasoning
      : undefined;

  const effectiveServiceTier =
    backendPrefs?.serviceTier ?? persisted.serviceTier;
  const serviceTier =
    effectiveServiceTier != null &&
    capabilities.serviceTiers.includes(effectiveServiceTier)
      ? effectiveServiceTier
      : undefined;

  return {
    mode: persisted.mode,
    modelId,
    perBackend: persisted.perBackend,
    permissionMode,
    personaId,
    reasoning,
    repositoryId,
    serviceTier,
    version: persisted.version,
  };
}

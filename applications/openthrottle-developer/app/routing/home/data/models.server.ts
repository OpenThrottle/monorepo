import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import {
  composeModelOptions,
  toAgentChatOptions,
  toChatModelOptions,
  toPersonaOptions,
} from '@openthrottle/react-router-chat-state';
import type { RepositoryOption } from '@openthrottle/react-router-chat-state';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type {
  DiscoverAgentClisQuery,
  DiscoverLocalModelsQuery,
} from '~/__generated__/graphql';
import {
  DiscoverAgentClisDocument,
  DiscoverLocalModelsDocument,
  PersonaPromptsDocument,
  WorkspaceLocalRepositoriesDocument,
} from '~/__generated__/graphql';

/**
 * The registered-checkout option type is single-sourced in
 * `@openthrottle/react-router-chat-state`; re-exported here so existing
 * `~/routing/home/data/models.server` importers keep their import path.
 */
export type { RepositoryOption };

type AgentClisPayload = DiscoverAgentClisQuery['discoverAgentClis'];
type LocalModelsPayload = DiscoverLocalModelsQuery['discoverLocalModels'];

/**
 * Fetch the agent-CLI discovery payload once. Returns `null` on failure so each
 * derived list degrades to `[]` independently and the composer still renders.
 */
async function fetchAgentClis(
  request: Request,
): Promise<AgentClisPayload | null> {
  try {
    const data = await executeGraphqlWithAuth(
      request,
      DiscoverAgentClisDocument,
    );

    return data.discoverAgentClis;
  } catch {
    return null;
  }
}

/** Fetch the local-model discovery payload once. `null` on failure (see above). */
async function fetchLocalModels(
  request: Request,
): Promise<LocalModelsPayload | null> {
  try {
    const data = await executeGraphqlWithAuth(
      request,
      DiscoverLocalModelsDocument,
    );

    return data.discoverLocalModels;
  } catch {
    return null;
  }
}

/**
 * @description Server-only loader helper: discover locally-running models for the
 * home composer dropdown. Returns an empty list when discovery fails or no local
 * model servers are running, so the route renders a clear empty/disabled state
 * rather than erroring.
 */
export async function loadDiscoveredModels(
  request: Request,
): Promise<ChatModelOption[]> {
  const localModels = await fetchLocalModels(request);

  return localModels ? toChatModelOptions(localModels) : [];
}

/**
 * @description Server-only loader helper: discover allowlisted agentic CLI
 * backends (cursor-agent, …) for the composer dropdown. Empty on failure so the
 * composer still renders with local models only.
 */
export async function loadAgentClis(
  request: Request,
): Promise<ChatModelOption[]> {
  const agents = await fetchAgentClis(request);

  return agents ? toAgentChatOptions(agents) : [];
}

/**
 * @description Server-only loader helper for the home composer: fetch BOTH
 * discovery queries exactly once and derive all three composer lists — local
 * models, agent CLIs, and the driver×local-endpoint join — from the shared
 * payloads (previously each query ran twice per home load because the
 * driver×endpoint join re-fetched them). The derivation is single-sourced in
 * `@openthrottle/react-router-chat-state`'s {@link composeModelOptions}.
 */
export async function loadComposerModels(
  request: Request,
): Promise<ChatModelOption[]> {
  const [agents, localModels] = await Promise.all([
    fetchAgentClis(request),
    fetchLocalModels(request),
  ]);

  return composeModelOptions(localModels, agents);
}

/**
 * @description Server-only loader helper: list the user's registered local
 * repositories for the CLI-agent working-directory selector. Empty on failure.
 */
export async function loadRepositories(
  request: Request,
): Promise<RepositoryOption[]> {
  try {
    const data = await executeGraphqlWithAuth(
      request,
      WorkspaceLocalRepositoriesDocument,
    );

    return data.workspaceLocalRepositories.map((repository) => ({
      displayName: repository.displayName,
      id: repository.id,
    }));
  } catch {
    return [];
  }
}

/**
 * @description Server-only loader helper: list registry personas (custom_prompts,
 * promptType=PERSONAS) for the composer's persona selector, so a selected
 * personaId is a real registry id the server resolves to a system prompt. Empty
 * on failure (the route falls back to its mock persona list).
 */
export async function loadPersonas(
  request: Request,
): Promise<ChatPersonaOption[]> {
  try {
    const data = await executeGraphqlWithAuth(request, PersonaPromptsDocument);

    return toPersonaOptions(data.customPrompts);
  } catch {
    return [];
  }
}

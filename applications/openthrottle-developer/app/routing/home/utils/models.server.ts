import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import { toCheckoutKind } from '@openthrottle/react-router-chat';
import type {
  ChatAgentRuntime,
  RepositoryOption,
} from '@openthrottle/react-router-chat-state';
import {
  composeModelOptions,
  toAgentChatOptions,
  toAgentRuntimes,
  toChatModelOptions,
  toPersonaOptions,
} from '@openthrottle/react-router-chat-state';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import type {
  DiscoverAgentClisQuery,
  DiscoverLocalModelsQuery,
} from '~/__generated__/graphql';
import {
  DiscoverAgentClisDocument,
  DiscoverLocalModelsDocument,
  HomeDefaultAgentDocument,
  PersonaPromptsDocument,
  WorkspaceLocalRepositoriesDocument,
} from '~/__generated__/graphql';
import type { ComposerDefaultAgent } from '~/routing/home/utils/seedComposerDefaultAgent';

/**
 * The registered-checkout option type is single-sourced in
 * `@openthrottle/react-router-chat-state`; re-exported here so existing
 * `~/routing/home/utils/models.server` importers keep their import path.
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
export async function loadAgentClis(request: Request): Promise<{
  readonly models: ChatModelOption[];
  readonly runtimes: Readonly<Record<string, ChatAgentRuntime>>;
}> {
  const agents = await fetchAgentClis(request);
  if (agents == null) {
    return { models: [], runtimes: {} };
  }

  return {
    models: toAgentChatOptions(agents),
    runtimes: toAgentRuntimes(agents),
  };
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
 * @description Server-only loader helper for the home route: like
 * {@link loadComposerModels} (ONE fetch of each discovery query) but also
 * returns the per-agent runtime facts (`agentRuntimes`) the composer reads to
 * gate permission modes by what the backend can actually do.
 */
export async function loadComposerData(request: Request): Promise<{
  readonly agentRuntimes: Readonly<Record<string, ChatAgentRuntime>>;
  readonly models: ChatModelOption[];
}> {
  const [agents, localModels] = await Promise.all([
    fetchAgentClis(request),
    fetchLocalModels(request),
  ]);

  return {
    agentRuntimes: agents ? toAgentRuntimes(agents) : {},
    models: composeModelOptions(localModels, agents),
  };
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
      // The branch the checkout is actually on; the repository's default only
      // until the first inspection scan lands. Showing the default for every
      // row made a worktree on `feat/x` read as `main`.
      branch:
        repository.gitCurrentBranch ?? repository.gitDefaultBranch ?? undefined,
      displayName: repository.displayName,
      filesystemPath: repository.filesystemPath,
      id: repository.id,
      kind: toCheckoutKind(repository.kind),
      projectName: repository.project?.name ?? undefined,
      remoteUrl: repository.gitRemoteUrl ?? undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * @description Server-only loader helper: the user's saved default agent, which
 * seeds the composer when the toolbar remembers no pick. `null` when unset or on
 * failure, so the composer keeps today's discovery-derived seed.
 */
export async function loadDefaultAgent(
  request: Request,
): Promise<ComposerDefaultAgent | null> {
  try {
    const data = await executeGraphqlWithAuth(
      request,
      HomeDefaultAgentDocument,
    );
    const agent = data.userPreferences.defaultAgent;

    if (agent == null) {
      return null;
    }

    return {
      backend: agent.backend,
      effort: agent.effort ?? null,
      model: agent.model,
    };
  } catch {
    return null;
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

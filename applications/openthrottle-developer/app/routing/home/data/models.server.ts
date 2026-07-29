import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  DiscoverAgentClisDocument,
  DiscoverLocalModelsDocument,
  PersonaPromptsDocument,
  WorkspaceLocalRepositoriesDocument,
} from '~/__generated__/graphql';
import {
  toAgentChatOptions,
  toChatModelOptions,
  toDriverEndpointChatOptions,
} from '~/routing/home/utils/chat-model-option';

/**
 * A registered local checkout selectable as the working directory for a CLI agent.
 */
export interface RepositoryOption {
  readonly displayName: string;
  readonly id: string;
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
  try {
    const data = await executeGraphqlWithAuth(
      request,
      DiscoverLocalModelsDocument,
    );

    return toChatModelOptions(data.discoverLocalModels);
  } catch {
    return [];
  }
}

/**
 * @description Server-only loader helper: discover allowlisted agentic CLI
 * backends (cursor-agent, …) for the composer dropdown. Empty on failure so the
 * composer still renders with local models only.
 */
export async function loadAgentClis(
  request: Request,
): Promise<ChatModelOption[]> {
  try {
    const data = await executeGraphqlWithAuth(
      request,
      DiscoverAgentClisDocument,
    );

    return toAgentChatOptions(data.discoverAgentClis);
  } catch {
    return [];
  }
}

/**
 * @description Server-only loader helper: join discovered agent CLIs with
 * discovered local endpoints into "driver × local endpoint/model" composer
 * options (only base-URL-capable drivers). Fetches both discovery queries
 * (server-side cached, 60s TTL); empty on failure so the composer still renders
 * the un-joined driver + endpoint groups.
 */
export async function loadDriverEndpointModels(
  request: Request,
): Promise<ChatModelOption[]> {
  try {
    const [agents, localModels] = await Promise.all([
      executeGraphqlWithAuth(request, DiscoverAgentClisDocument),
      executeGraphqlWithAuth(request, DiscoverLocalModelsDocument),
    ]);

    return toDriverEndpointChatOptions(
      agents.discoverAgentClis,
      localModels.discoverLocalModels,
    );
  } catch {
    return [];
  }
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

    return data.customPrompts.map((persona) => ({
      description: persona.description ?? undefined,
      id: persona.id,
      label: persona.title,
    }));
  } catch {
    return [];
  }
}

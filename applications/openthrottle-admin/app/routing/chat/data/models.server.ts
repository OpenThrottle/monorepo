import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import {
  CLI_MODEL_GROUP_ID,
  encodeModelOptionId,
  openaiGroupId,
} from '@openthrottle/react-router-chat-state';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  DiscoverAgentClisDocument,
  DiscoverLocalModelsDocument,
  PersonaPromptsDocument,
  WorkspaceLocalRepositoriesDocument,
  type DiscoverAgentClisQuery,
  type DiscoverLocalModelsQuery,
} from '~/__generated__/graphql';

/**
 * @description Server-only loader helpers for the admin header chat's composer
 * discovery data. Mirrors the developer app's `models.server.ts`; the GraphQL
 * discovery → toolbar-option mappers are inlined here (their only consumer),
 * reusing the pure id/group helpers from `@openthrottle/react-router-chat-state`.
 * Each loader degrades to `[]` on failure so the composer renders an
 * empty/disabled state rather than erroring.
 */

/** A registered local checkout selectable as the working directory for a CLI agent. */
export interface RepositoryOption {
  readonly displayName: string;
  readonly id: string;
}

function toChatModelOptions(
  discovery: DiscoverLocalModelsQuery['discoverLocalModels'],
): ChatModelOption[] {
  return discovery.endpoints.flatMap((endpoint) => {
    const providerOrHost = endpoint.provider ?? endpoint.host;
    return endpoint.models.map((model) => ({
      description: providerOrHost,
      groupId: openaiGroupId(providerOrHost),
      id: encodeModelOptionId(endpoint.baseUrl, model),
      label: model,
    }));
  });
}

function toAgentChatOptions(
  discovery: DiscoverAgentClisQuery['discoverAgentClis'],
): ChatModelOption[] {
  return discovery.agents.map((agent) => {
    const hasVersion = agent.version !== null;
    const description = !hasVersion
      ? 'Agent CLI'
      : `Agent CLI · ${agent.version}`;

    return {
      description,
      groupId: CLI_MODEL_GROUP_ID,
      id: agent.backend,
      label: agent.label,
      subLabel: description,
    };
  });
}

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

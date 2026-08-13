import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import {
  toAgentChatOptions,
  toChatModelOptions,
  toPersonaOptions,
} from '@openthrottle/react-router-chat-state';
import type { RepositoryOption } from '@openthrottle/react-router-chat-state';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  DiscoverAgentClisDocument,
  DiscoverLocalModelsDocument,
  PersonaPromptsDocument,
  WorkspaceLocalRepositoriesDocument,
} from '~/__generated__/graphql';

/**
 * @description Server-only loader helpers for the admin header chat's composer
 * discovery data. The GraphQL discovery → toolbar-option mappers are single-
 * sourced in `@openthrottle/react-router-chat-state` (shared with the developer
 * app). Each loader degrades to `[]` on failure so the composer renders an
 * empty/disabled state rather than erroring.
 */

/**
 * The registered-checkout option type is single-sourced in
 * `@openthrottle/react-router-chat-state`; re-exported here so existing
 * `~/routing/chat/data/models.server` importers keep their import path.
 */
export type { RepositoryOption };

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

    return toPersonaOptions(data.customPrompts);
  } catch {
    return [];
  }
}

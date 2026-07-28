import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import {
  loadAgentClis,
  loadDiscoveredModels,
  loadPersonas,
  loadRepositories,
} from '~/routing/chat/data/models.server';
import type { RepositoryOption } from '~/routing/chat/data/models.server';
import type { Route } from '@/app/routes/+types/resources.chat-options';

/** JSON shape returned to the admin header chat's option-data fetcher. */
export interface ChatOptionsResponse {
  /** Discovered local OpenAI models followed by allowlisted agent CLIs. */
  readonly models: readonly ChatModelOption[];
  readonly personas: readonly ChatPersonaOption[];
  readonly repositories: readonly RepositoryOption[];
}

/**
 * Resource route (loader-only) supplying the composer toolbar's discovery data
 * for the admin app — `/resources/chat-options`. Mirrors the developer route:
 * the global header ChatDialog mounts on every route, so it reads this
 * route-independent endpoint rather than a page loader. Each helper degrades to
 * `[]` on failure. Admin often has no local models/repositories, so the toolbar
 * simply shows empty/disabled controls.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<ChatOptionsResponse> => {
  const [localModels, agentClis, repositories, personas] = await Promise.all([
    loadDiscoveredModels(args.request),
    loadAgentClis(args.request),
    loadRepositories(args.request),
    loadPersonas(args.request),
  ]);

  return {
    models: [...localModels, ...agentClis],
    personas,
    repositories,
  };
};

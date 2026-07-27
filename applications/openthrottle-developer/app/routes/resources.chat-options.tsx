import type {
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';
import {
  loadAgentClis,
  loadDiscoveredModels,
  loadPersonas,
  loadRepositories,
} from '~/routing/home/data/models.server';
import type { RepositoryOption } from '~/routing/home/data/models.server';
import type { Route } from '@/app/routes/+types/resources.chat-options';

/** JSON shape returned to the global header chat's option-data fetcher. */
export interface ChatOptionsResponse {
  /** Discovered local OpenAI models followed by allowlisted agent CLIs. */
  readonly models: readonly ChatModelOption[];
  readonly personas: readonly ChatPersonaOption[];
  readonly repositories: readonly RepositoryOption[];
}

/**
 * Resource route (loader-only) supplying the composer toolbar's discovery data
 * — `/resources/chat-options`. The global header `ChatDialog` mounts on every
 * route, so it cannot read the `/` (home) loader; this route-independent
 * endpoint reuses the same {@link loadDiscoveredModels} / {@link loadAgentClis}
 * / {@link loadRepositories} / {@link loadPersonas} helpers (each already
 * degrades to `[]` on failure), so a discovery gap renders empty/disabled
 * controls rather than erroring. Runs as the caller via `executeGraphqlWithAuth`
 * inside those helpers.
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

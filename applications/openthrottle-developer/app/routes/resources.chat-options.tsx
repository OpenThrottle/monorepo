import {
  buildChatOptionsResponse,
  type ChatOptionsResponse,
} from '@openthrottle/react-router-chat-state';
import {
  loadAgentClis,
  loadDiscoveredModels,
  loadPersonas,
  loadRepositories,
} from '~/routing/home/data/models.server';
import type { Route } from '@/app/routes/+types/resources.chat-options';

/**
 * The response contract is single-sourced in
 * `@openthrottle/react-router-chat-state`; re-exported here so existing
 * `~/routes/resources.chat-options` importers keep their import path.
 */
export type { ChatOptionsResponse };

/**
 * Resource route (loader-only) supplying the composer toolbar's discovery data
 * — `/resources/chat-options`. The global header `ChatDialog` mounts on every
 * route, so it cannot read the `/` (home) loader; this route-independent
 * endpoint reuses the same {@link loadDiscoveredModels} / {@link loadAgentClis}
 * / {@link loadRepositories} / {@link loadPersonas} helpers (each already
 * degrades to `[]` on failure), so a discovery gap renders empty/disabled
 * controls rather than erroring. Runs as the caller via `executeGraphqlWithAuth`
 * inside those helpers. The response shaping is shared via
 * {@link buildChatOptionsResponse} so the developer and admin routes cannot drift.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<ChatOptionsResponse> =>
  buildChatOptionsResponse({
    loadAgentClis: () => loadAgentClis(args.request),
    loadDiscoveredModels: () => loadDiscoveredModels(args.request),
    loadPersonas: () => loadPersonas(args.request),
    loadRepositories: () => loadRepositories(args.request),
  });

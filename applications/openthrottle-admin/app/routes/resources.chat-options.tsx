import {
  buildChatOptionsResponse,
  type ChatOptionsResponse,
} from '@openthrottle/react-router-chat-state';
import {
  loadAgentClis,
  loadDiscoveredModels,
  loadPersonas,
  loadRepositories,
} from '~/routing/chat/data/models.server';
import type { Route } from '@/app/routes/+types/resources.chat-options';

/**
 * The response contract is single-sourced in
 * `@openthrottle/react-router-chat-state`; re-exported here so existing
 * `~/routes/resources.chat-options` importers keep their import path.
 */
export type { ChatOptionsResponse };

/**
 * Resource route (loader-only) supplying the composer toolbar's discovery data
 * for the admin app — `/resources/chat-options`. Mirrors the developer route:
 * the global header ChatDialog mounts on every route, so it reads this
 * route-independent endpoint rather than a page loader. Each helper degrades to
 * `[]` on failure. Admin often has no local models/repositories, so the toolbar
 * simply shows empty/disabled controls. The response shaping is shared via
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

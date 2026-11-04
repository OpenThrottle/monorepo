import type { ChatOptionsResponse } from '../utils/chat-discovery-options';

/**
 * The empty discovery result used until `/resources/chat-options` (or the
 * client cache) provides one. A stable reference, so the option lists derived
 * from it keep their identity across renders.
 */
export const EMPTY_CHAT_OPTIONS: ChatOptionsResponse = {
  models: [],
  personas: [],
  repositories: [],
};

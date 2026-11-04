import type { ChatOptionsResponse } from './utils/chat-discovery-options';

/**
 * A client-side discovery-options cache (module-scope + sessionStorage) the host
 * app may provide so a warm mount reuses the last good `/resources/chat-options`
 * result. Optional — omit it and the controller always probes the route.
 * @public
 */
export interface HeaderChatOptionsCache {
  read(): ChatOptionsResponse | null;
  write(options: ChatOptionsResponse): void;
}

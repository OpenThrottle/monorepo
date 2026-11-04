import { CHAT_TOOLBAR_STORAGE_KEY } from '../data/atom.chat-toolbar';

/**
 * sessionStorage key whose presence marks that the elevated-permission decay
 * has already run for the current browser session. Derived from
 * {@link CHAT_TOOLBAR_STORAGE_KEY} so it is app-namespaced like the toolbar blob.
 * @public
 */
export const CHAT_TOOLBAR_SESSION_SENTINEL_KEY = `${CHAT_TOOLBAR_STORAGE_KEY}:session`;

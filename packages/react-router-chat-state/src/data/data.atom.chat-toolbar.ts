import { atomWithStorage } from 'jotai/utils';

import { createChatToolbarStorage } from '../utils/createChatToolbarStorage';
import {
  CHAT_TOOLBAR_STORAGE_KEY,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from './data.chat-toolbar-state';

/**
 * Global, localStorage-backed atom holding the persisted Chat Toolbar
 * selections. `getOnInit` hydrates synchronously from storage so the toolbar
 * renders the saved values on first paint (client-side).
 * @public
 */
export const chatToolbarStateAtom = atomWithStorage(
  CHAT_TOOLBAR_STORAGE_KEY,
  DEFAULT_CHAT_TOOLBAR_STATE,
  createChatToolbarStorage(),
  { getOnInit: true },
);

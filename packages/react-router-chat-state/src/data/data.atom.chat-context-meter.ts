import { atomWithStorage } from 'jotai/utils';

import { createChatContextMeterStorage } from '../utils/createChatContextMeterStorage';
import {
  CHAT_CONTEXT_METER_STORAGE_KEY,
  DEFAULT_CHAT_CONTEXT_METER,
} from './data.chat-context-meter-state';

/**
 * Whether the composer shows its context-window meter beside the token
 * counter. localStorage-backed and off by default: the meter is opt-in.
 * @public
 */
export const chatContextMeterAtom = atomWithStorage(
  CHAT_CONTEXT_METER_STORAGE_KEY,
  DEFAULT_CHAT_CONTEXT_METER,
  createChatContextMeterStorage(),
  { getOnInit: true },
);

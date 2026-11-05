import type { ChatMessage } from '../types';

/**
 * Stable empty seed: the home/header surfaces have no conversation id in the URL
 * to seed history from, so the thread starts empty and fills from the stream.
 */
export const EMPTY_CHAT_SEED: readonly ChatMessage[] = [];

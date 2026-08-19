import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ChatOptionsResponse } from '@openthrottle/react-router-chat-state';
import {
  CHAT_OPTIONS_CACHE_TTL_MS,
  clearChatOptionsCache,
  readChatOptionsCache,
  writeChatOptionsCache,
} from '../chat-options-cache';

const SAMPLE: ChatOptionsResponse = {
  models: [
    {
      description: 'ollama',
      groupId: 'openai:ollama',
      id: 'http://localhost:11434/v1::llama3',
      label: 'llama3',
    },
  ],
  personas: [],
  repositories: [],
};

describe('chat-options client cache', () => {
  beforeEach(() => {
    clearChatOptionsCache();
  });

  afterEach(() => {
    clearChatOptionsCache();
    vi.useRealTimers();
  });

  test('returns null when nothing is cached', () => {
    expect(readChatOptionsCache()).toBeNull();
  });

  test('reads back a written value within the TTL', () => {
    writeChatOptionsCache(SAMPLE);
    expect(readChatOptionsCache()).toEqual(SAMPLE);
  });

  test('expires the entry past the TTL', () => {
    vi.useFakeTimers();
    writeChatOptionsCache(SAMPLE);
    vi.advanceTimersByTime(CHAT_OPTIONS_CACHE_TTL_MS + 1);
    expect(readChatOptionsCache()).toBeNull();
  });

  test('honors a caller-provided TTL', () => {
    vi.useFakeTimers();
    writeChatOptionsCache(SAMPLE);
    vi.advanceTimersByTime(5_000);
    expect(readChatOptionsCache(1_000)).toBeNull();
    expect(readChatOptionsCache(10_000)).toEqual(SAMPLE);
  });

  test('clear() drops the cache', () => {
    writeChatOptionsCache(SAMPLE);
    clearChatOptionsCache();
    expect(readChatOptionsCache()).toBeNull();
  });

  test('rehydrates from sessionStorage after the module-scope layer is gone', async () => {
    writeChatOptionsCache(SAMPLE);
    // Fresh module instance => module-scope memory is empty, forcing the read to
    // fall back to the sessionStorage layer (which persists across the reload).
    vi.resetModules();
    const fresh = await import('../chat-options-cache');
    expect(fresh.readChatOptionsCache()).toEqual(SAMPLE);
  });
});

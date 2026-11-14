import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { HomeComposerData } from '../home-composer-cache';
import {
  clearHomeComposerCache,
  HOME_COMPOSER_CACHE_TTL_MS,
  isComposerNeutralAction,
  readHomeComposerCache,
  writeHomeComposerCache,
} from '../home-composer-cache';

const SAMPLE: HomeComposerData = {
  agentRuntimes: {},
  defaultAgent: null,
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

const EMPTY: HomeComposerData = { ...SAMPLE, models: [] };

describe('home composer client cache', () => {
  beforeEach(() => {
    clearHomeComposerCache();
  });

  afterEach(() => {
    clearHomeComposerCache();
    vi.useRealTimers();
  });

  test('returns null when nothing is cached', () => {
    expect(readHomeComposerCache()).toBeNull();
  });

  test('uses a five-minute freshness window', () => {
    expect(HOME_COMPOSER_CACHE_TTL_MS).toBe(300_000);
  });

  test('reads back a written value within the TTL', () => {
    vi.useFakeTimers();
    writeHomeComposerCache(SAMPLE);
    vi.advanceTimersByTime(HOME_COMPOSER_CACHE_TTL_MS - 1);
    expect(readHomeComposerCache()).toEqual(SAMPLE);
  });

  test('expires the entry past the TTL', () => {
    vi.useFakeTimers();
    writeHomeComposerCache(SAMPLE);
    vi.advanceTimersByTime(HOME_COMPOSER_CACHE_TTL_MS + 1);
    expect(readHomeComposerCache()).toBeNull();
  });

  test('never caches an empty discovery', () => {
    writeHomeComposerCache(EMPTY);
    expect(readHomeComposerCache()).toBeNull();
    expect(sessionStorage.getItem('openthrottle.home-composer.v1')).toBeNull();
  });

  test('ignores a tampered sessionStorage blob', async () => {
    sessionStorage.setItem(
      'openthrottle.home-composer.v1',
      JSON.stringify({ data: { models: 'nope' }, storedAt: Date.now() }),
    );
    vi.resetModules();
    const fresh = await import('../home-composer-cache');
    expect(fresh.readHomeComposerCache()).toBeNull();
  });

  test('rehydrates from sessionStorage after the module-scope layer is gone', async () => {
    writeHomeComposerCache(SAMPLE);
    vi.resetModules();
    const fresh = await import('../home-composer-cache');
    expect(fresh.readHomeComposerCache()).toEqual(SAMPLE);
  });

  test('clear() drops both layers', () => {
    writeHomeComposerCache(SAMPLE);
    clearHomeComposerCache();
    expect(readHomeComposerCache()).toBeNull();
  });
});

describe('isComposerNeutralAction', () => {
  test('treats the chat resource actions as neutral', () => {
    expect(isComposerNeutralAction('/resources/conversation-stream')).toBe(
      true,
    );
    expect(isComposerNeutralAction('/resources/agent-conversations?x=1')).toBe(
      true,
    );
  });

  test('treats any other or missing action as composer-affecting', () => {
    expect(isComposerNeutralAction('/settings/repositories')).toBe(false);
    expect(isComposerNeutralAction(undefined)).toBe(false);
  });
});

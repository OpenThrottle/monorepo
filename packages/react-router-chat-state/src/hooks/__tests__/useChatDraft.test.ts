import type { RenderHookResult } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  CHAT_DRAFT_NEW_CONVERSATION_KEY,
  CHAT_DRAFT_WRITE_DELAY_MS,
  CHAT_DRAFTS_STATE_VERSION,
  CHAT_DRAFTS_STORAGE_KEY,
  normalizeChatDraftsState,
} from '../../data/atom.chat-drafts';
import type { UseChatDraftOptions, UseChatDraftResult } from '../useChatDraft';
import { useChatDraft } from '../useChatDraft';

const seedDrafts = (drafts: Record<string, string>): void => {
  localStorage.setItem(
    CHAT_DRAFTS_STORAGE_KEY,
    JSON.stringify({ drafts, version: CHAT_DRAFTS_STATE_VERSION }),
  );
};

const readPersisted = (): Readonly<Record<string, string>> =>
  normalizeChatDraftsState(
    JSON.parse(localStorage.getItem(CHAT_DRAFTS_STORAGE_KEY) ?? '{}'),
  ).drafts;

const renderDraft = (
  initial: UseChatDraftOptions,
): RenderHookResult<UseChatDraftResult, UseChatDraftOptions> => {
  const store = createStore();
  return renderHook((props: UseChatDraftOptions) => useChatDraft(props), {
    initialProps: initial,
    wrapper: ({ children }: { readonly children: React.ReactNode }) =>
      React.createElement(Provider, { store }, children),
  });
};

describe('useChatDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  test('starts from the stored draft for the conversation', () => {
    seedDrafts({ 'conv-1': 'half a thought' });

    const { result } = renderDraft({ conversationId: 'conv-1' });

    expect(result.current.draft).toBe('half a thought');
  });

  test('uses the new-conversation slot when there is no conversation id', () => {
    seedDrafts({ [CHAT_DRAFT_NEW_CONVERSATION_KEY]: 'fresh idea' });

    const { result } = renderDraft({ conversationId: null });

    expect(result.current.draft).toBe('fresh idea');
  });

  describe('when typing', () => {
    test('updates the draft at once but writes it only after the pause', () => {
      const { result } = renderDraft({ conversationId: 'conv-1' });

      act(() => result.current.setDraft('hello'));

      expect(result.current.draft).toBe('hello');
      expect(readPersisted()['conv-1']).toBeUndefined();

      act(() => vi.advanceTimersByTime(CHAT_DRAFT_WRITE_DELAY_MS));

      expect(readPersisted()['conv-1']).toBe('hello');
    });

    test('restarts the pause on every keystroke', () => {
      const { result } = renderDraft({ conversationId: 'conv-1' });

      act(() => result.current.setDraft('he'));
      act(() => vi.advanceTimersByTime(CHAT_DRAFT_WRITE_DELAY_MS - 50));
      act(() => result.current.setDraft((previous) => `${previous}llo`));
      act(() => vi.advanceTimersByTime(CHAT_DRAFT_WRITE_DELAY_MS - 50));

      expect(readPersisted()['conv-1']).toBeUndefined();

      act(() => vi.advanceTimersByTime(50));

      expect(readPersisted()['conv-1']).toBe('hello');
    });
  });

  describe('when cleared', () => {
    test('clearDraft empties the draft and removes it from storage at once', () => {
      seedDrafts({ 'conv-1': 'about to send' });
      const { result } = renderDraft({ conversationId: 'conv-1' });

      act(() => result.current.clearDraft());

      expect(result.current.draft).toBe('');
      expect(readPersisted()['conv-1']).toBeUndefined();
    });

    test('setting an empty draft removes it without waiting for the pause', () => {
      seedDrafts({ 'conv-1': 'about to send' });
      const { result } = renderDraft({ conversationId: 'conv-1' });

      act(() => result.current.setDraft(''));

      expect(readPersisted()['conv-1']).toBeUndefined();
    });
  });

  describe('when the conversation changes', () => {
    test('shows the other conversation draft and keeps both', () => {
      seedDrafts({ 'conv-2': 'second draft' });
      const { rerender, result } = renderDraft({ conversationId: 'conv-1' });

      act(() => result.current.setDraft('first draft'));
      rerender({ conversationId: 'conv-2' });

      expect(result.current.draft).toBe('second draft');
      // The unwritten conv-1 draft is flushed, not dropped.
      expect(readPersisted()).toEqual({
        'conv-1': 'first draft',
        'conv-2': 'second draft',
      });

      rerender({ conversationId: 'conv-1' });

      expect(result.current.draft).toBe('first draft');
    });
  });

  describe('when unmounted mid-pause', () => {
    test('flushes the pending draft', () => {
      const { result, unmount } = renderDraft({ conversationId: 'conv-1' });

      act(() => result.current.setDraft('leaving now'));
      unmount();

      expect(readPersisted()['conv-1']).toBe('leaving now');
    });
  });
});

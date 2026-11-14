import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { clearConversationIdParam } from '../../utils/conversation-url';
import { useConversationUrlSync } from '../useConversationUrlSync';

describe('useConversationUrlSync', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  test('replaces (not pushes) the id and keeps the router history state', () => {
    const state = { idx: 3, key: 'abc', usr: null };
    window.history.replaceState(state, '', '/');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    const pushSpy = vi.spyOn(window.history, 'pushState');

    renderHook(() =>
      useConversationUrlSync({ conversationId: 'c-1', persist: true }),
    );

    expect(window.location.search).toBe('?conversationId=c-1');
    expect(replaceSpy).toHaveBeenCalledWith(state, '', expect.any(URL));
    expect(pushSpy).not.toHaveBeenCalled();
  });

  test('writes nothing for a private turn', () => {
    renderHook(() =>
      useConversationUrlSync({ conversationId: 'c-1', persist: false }),
    );

    expect(window.location.search).toBe('');
  });

  test('writes nothing until the server assigns an id', () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState');

    renderHook(() =>
      useConversationUrlSync({ conversationId: null, persist: true }),
    );

    expect(replaceSpy).not.toHaveBeenCalled();
  });

  test('clearConversationIdParam removes the param (New chat)', () => {
    window.history.replaceState(null, '', '/?conversationId=c-1&x=1');

    clearConversationIdParam();

    expect(window.location.search).toBe('?x=1');
  });

  test('does not touch the router: no popstate/navigation event fires', () => {
    const listener = vi.fn();
    window.addEventListener('popstate', listener);

    renderHook(() =>
      useConversationUrlSync({ conversationId: 'c-2', persist: true }),
    );

    window.removeEventListener('popstate', listener);
    expect(listener).not.toHaveBeenCalled();
  });
});

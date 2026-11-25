import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { useNewChatRequest } from '../useNewChatRequest';

const renderAt = (state: unknown, onNewChat: () => void): void => {
  renderHook(() => useNewChatRequest({ onNewChat }), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={[{ pathname: '/', state }]}>
        {children}
      </MemoryRouter>
    ),
  });
};

describe('useNewChatRequest', () => {
  test('clears the thread when the location carries a New chat request', () => {
    const onNewChat = vi.fn();
    renderAt({ newChat: 1 }, onNewChat);

    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  test('does nothing on a plain visit', () => {
    const onNewChat = vi.fn();
    renderAt(null, onNewChat);

    expect(onNewChat).not.toHaveBeenCalled();
  });

  test('ignores a request that is not a timestamp', () => {
    const onNewChat = vi.fn();
    renderAt({ newChat: 'yes' }, onNewChat);

    expect(onNewChat).not.toHaveBeenCalled();
  });
});

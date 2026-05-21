import * as React from 'react';
import { render, renderHook } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ChatDialog } from '../../components/ChatDialog';
import { ChatProvider, useChat } from '../chat-context';
import type { ChatMessage } from '../../types';

describe('ChatProvider', () => {
  let onSendMessage: ReturnType<typeof vi.fn<(message: string) => void>>;
  const messages: readonly ChatMessage[] = [
    { body: 'From context', id: 'ctx-1', role: 'assistant' },
  ];

  const renderWithProvider = (): RenderResult => {
    const Comp = () => (
      <ChatProvider messages={messages} onSendMessage={onSendMessage}>
        <ChatDialog triggerLabel="Context chat" />
      </ChatProvider>
    );
    const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    onSendMessage = vi.fn();
  });

  test('should supply messages to ChatDialog without explicit props', async () => {
    const user = userEvent.setup();
    const component = renderWithProvider();
    await user.click(component.getByRole('button', { name: 'Context chat' }));
    expect(component.getByText('From context')).toBeInTheDocument();
  });

  describe('when user sends a message', () => {
    test('should call context onSendMessage', async () => {
      const user = userEvent.setup();
      const component = renderWithProvider();
      await user.click(component.getByRole('button', { name: 'Context chat' }));
      await user.type(component.getByLabelText('Message'), 'Via provider');
      await user.click(component.getByRole('button', { name: 'Send' }));
      expect(onSendMessage).toHaveBeenCalledWith('Via provider');
    });
  });
});

describe('useChat', () => {
  test('should throw outside ChatProvider', () => {
    expect(() => renderHook(() => useChat())).toThrow(
      'useChat must be used within a ChatProvider.',
    );
  });
});

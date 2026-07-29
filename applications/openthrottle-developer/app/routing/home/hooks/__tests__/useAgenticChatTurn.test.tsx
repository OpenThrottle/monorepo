import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useAgenticChatTurn } from '../useAgenticChatTurn';

// No ws client → the stream subscription never opens a socket; these tests
// exercise the restore/reset lifecycle, not live streaming.
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

const RESTORED = {
  conversationId: 'conv-42',
  errorMessage: null,
  messages: [
    { body: 'Earlier question', id: 'm1', role: 'user' },
    { body: 'Earlier answer', id: 'm2', role: 'assistant' },
  ],
};

const renderTurn = (): RenderResult => {
  const Harness = (): React.ReactElement => {
    const turn = useAgenticChatTurn();
    return (
      <div>
        <span data-testid="conversation-id">
          {turn.conversationId ?? 'none'}
        </span>
        <span data-testid="message-count">{turn.messages.length}</span>
        <button
          onClick={() => turn.restore({ conversationId: 'conv-42' })}
          type="button"
        >
          Restore
        </button>
        <button onClick={() => turn.reset()} type="button">
          Reset
        </button>
      </div>
    );
  };

  const RoutesStub = createRoutesStub([
    { Component: Harness, path: '/' },
    {
      action: () => RESTORED,
      path: '/resources/agent-conversations',
    },
  ]);

  return render(<RoutesStub />);
};

describe('useAgenticChatTurn restore/reset', () => {
  test('restore seeds the conversation id and hydrates its messages', async () => {
    const user = userEvent.setup();
    const component = renderTurn();

    expect(component.getByTestId('conversation-id')).toHaveTextContent('none');

    await user.click(component.getByRole('button', { name: 'Restore' }));

    // Id is seeded synchronously; messages hydrate once the load resolves.
    expect(component.getByTestId('conversation-id')).toHaveTextContent(
      'conv-42',
    );
    await waitFor(() =>
      expect(component.getByTestId('message-count')).toHaveTextContent('2'),
    );
  });

  test('reset clears the conversation id and thread', async () => {
    const user = userEvent.setup();
    const component = renderTurn();

    await user.click(component.getByRole('button', { name: 'Restore' }));
    await waitFor(() =>
      expect(component.getByTestId('message-count')).toHaveTextContent('2'),
    );

    await user.click(component.getByRole('button', { name: 'Reset' }));

    expect(component.getByTestId('conversation-id')).toHaveTextContent('none');
    expect(component.getByTestId('message-count')).toHaveTextContent('0');
  });
});

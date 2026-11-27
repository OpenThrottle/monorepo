import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { ChatMessage } from '../../types';
import { useChatEarlierMessages } from '../useChatEarlierMessages';

const SHOWN: ChatMessage[] = [
  { body: 'newest question', id: 'm3', role: 'user' },
  { body: 'newest answer', id: 'm4', role: 'assistant' },
];

// A page holding one row the thread already shows (m3), to prove the dedupe.
const EARLIER_PAGE = {
  activeTurn: null,
  conversationId: 'conv-1',
  errorMessage: null,
  firstMessageIndex: 0,
  messages: [
    { body: 'first question', id: 'm1', role: 'user' },
    { body: 'first answer', id: 'm2', role: 'assistant' },
    { body: 'newest question', id: 'm3', role: 'user' },
  ],
};

// The conversation the harness's thread is on; set per test by renderHarness.
let harnessConversationId = 'conv-1';

const Harness = (): React.ReactElement => {
  const conversationId = harnessConversationId;
  const [messages, setMessages] = React.useState<ChatMessage[]>(SHOWN);
  const { loadEarlier, seed } = useChatEarlierMessages({
    conversationId,
    setMessages,
  });

  return (
    <div>
      <span data-testid="ids">{messages.map((m) => m.id).join('|')}</span>
      <span data-testid="has-earlier">
        {loadEarlier.hasEarlier ? 'yes' : 'no'}
      </span>
      <button onClick={() => seed(2)} type="button">
        Seed
      </button>
      <button onClick={loadEarlier.onLoadEarlier} type="button">
        Load earlier
      </button>
    </div>
  );
};

const renderHarness = (
  action: (args: { request: Request }) => Promise<unknown>,
  conversationId = 'conv-1',
): ReturnType<typeof render> => {
  harnessConversationId = conversationId;
  const RoutesStub = createRoutesStub([
    { Component: Harness, path: '/' },
    { action, path: '/resources/agent-conversations' },
  ]);

  return render(<RoutesStub />);
};

describe('useChatEarlierMessages', () => {
  describe('before a restore seeds it', () => {
    test('offers nothing and posts nothing', async () => {
      const user = userEvent.setup();
      const action = vi.fn(async () => EARLIER_PAGE);
      const component = renderHarness(action);

      expect(component.getByTestId('has-earlier')).toHaveTextContent('no');
      await user.click(component.getByRole('button', { name: 'Load earlier' }));

      expect(action).not.toHaveBeenCalled();
    });
  });

  describe('after a restore that left older rows', () => {
    test('asks for the rows before the oldest shown one and prepends them once', async () => {
      const user = userEvent.setup();
      const bodies: FormData[] = [];
      const component = renderHarness(async ({ request }) => {
        bodies.push(await request.formData());
        return EARLIER_PAGE;
      });

      await user.click(component.getByRole('button', { name: 'Seed' }));
      expect(component.getByTestId('has-earlier')).toHaveTextContent('yes');
      await user.click(component.getByRole('button', { name: 'Load earlier' }));

      await waitFor(() => {
        expect(component.getByTestId('ids')).toHaveTextContent('m1|m2|m3|m4');
      });
      expect(bodies[0]?.get('before')).toBe('2');
      expect(bodies[0]?.get('intent')).toBe('load-messages');
      expect(component.getByTestId('has-earlier')).toHaveTextContent('no');
    });
  });

  describe('when the page belongs to another conversation', () => {
    test('drops it', async () => {
      const user = userEvent.setup();
      const action = vi.fn(async () => EARLIER_PAGE);
      const component = renderHarness(action, 'conv-2');

      await user.click(component.getByRole('button', { name: 'Seed' }));
      await user.click(component.getByRole('button', { name: 'Load earlier' }));

      await waitFor(() => {
        expect(action).toHaveBeenCalledTimes(1);
      });
      expect(component.getByTestId('ids')).toHaveTextContent('m3|m4');
      expect(component.getByTestId('has-earlier')).toHaveTextContent('yes');
    });
  });
});

import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ChatMessage, ChatTurnToolEvent } from '../../types';
import { CHAT_TOOL_STATUS } from '../../types';
import { ChatSessionDrawerRunning } from '../ChatSessionDrawerRunning';

const tool = (overrides: Partial<ChatTurnToolEvent>): ChatTurnToolEvent => {
  return {
    argsJson: null,
    callId: null,
    error: null,
    kind: 'tool',
    name: 'bash',
    resultJson: null,
    sortOrder: 1,
    status: CHAT_TOOL_STATUS.running,
    ...overrides,
  };
};

const assistant = (overrides: Partial<ChatMessage>): ChatMessage => {
  return { body: '', id: 'a', role: 'assistant', ...overrides };
};

describe('ChatSessionDrawerRunning', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when idle', () => {
    test('shows the empty state and no clock', () => {
      const component = render(
        <ChatSessionDrawerRunning
          isStreaming={false}
          messages={[assistant({})]}
          queuedMessages={undefined}
        />,
      );

      expect(
        component.getByTestId('ChatSessionDrawerRunning'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('ChatSessionDrawerRunning-elapsed'),
      ).toBeNull();
      expect(component.queryByRole('status')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('when streaming', () => {
    test('shows the phase and a ticking elapsed time', () => {
      const component = render(
        <ChatSessionDrawerRunning
          isStreaming={true}
          messages={[assistant({ pending: true })]}
          queuedMessages={[]}
        />,
      );

      expect(component.getByRole('status')).toBeInTheDocument();
      expect(
        component.getByTestId('ChatSessionDrawerRunning-elapsed'),
      ).toHaveTextContent('0s');

      act(() => {
        vi.advanceTimersByTime(65_000);
      });

      expect(
        component.getByTestId('ChatSessionDrawerRunning-elapsed'),
      ).toHaveTextContent('1m 05s');
    });

    test('lists running tools and agents separately, skipping finished tools', () => {
      const component = render(
        <ChatSessionDrawerRunning
          isStreaming={true}
          messages={[
            assistant({
              events: [
                tool({ callId: 'c1', name: 'read', sortOrder: 1 }),
                tool({
                  argsJson: JSON.stringify({ description: 'Audit the repo' }),
                  callId: 'c2',
                  name: 'Task',
                  sortOrder: 2,
                }),
                tool({
                  callId: 'c3',
                  name: 'grep',
                  sortOrder: 3,
                  status: CHAT_TOOL_STATUS.succeeded,
                }),
              ],
            }),
          ]}
          queuedMessages={[]}
        />,
      );

      const tools = component.getByTestId('ChatSessionDrawerRunning-tools');
      const agents = component.getByTestId('ChatSessionDrawerRunning-agents');

      expect(tools).toHaveTextContent('read');
      expect(tools).not.toHaveTextContent('grep');
      expect(agents).toHaveTextContent('Audit the repo');
    });

    test('omits the tool and agent lists when none are running', () => {
      const component = render(
        <ChatSessionDrawerRunning
          isStreaming={true}
          messages={[assistant({ pending: true })]}
          queuedMessages={[]}
        />,
      );

      expect(
        component.queryByTestId('ChatSessionDrawerRunning-tools'),
      ).toBeNull();
      expect(
        component.queryByTestId('ChatSessionDrawerRunning-agents'),
      ).toBeNull();
    });
  });

  describe('with queued messages', () => {
    test('lists them even when the turn is not streaming', () => {
      const component = render(
        <ChatSessionDrawerRunning
          isStreaming={false}
          messages={[]}
          queuedMessages={[
            { fields: {}, id: 'q1', message: 'first follow-up' },
            { fields: {}, id: 'q2', message: 'second follow-up' },
          ]}
        />,
      );

      const queued = component.getByTestId('ChatSessionDrawerRunning-queued');

      expect(queued).toHaveTextContent('first follow-up');
      expect(queued).toHaveTextContent('second follow-up');
      expect(component.getAllByRole('listitem')).toHaveLength(2);
      expect(
        component.queryByTestId('ChatSessionDrawerRunning-elapsed'),
      ).toBeNull();
    });
  });
});

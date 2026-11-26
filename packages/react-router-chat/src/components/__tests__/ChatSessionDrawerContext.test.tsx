import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import type { ChatMessage, ChatTokenUsage } from '../../types';
import { ChatSessionDrawerContext } from '../ChatSessionDrawerContext';

const turn = (usage: ChatTokenUsage): ChatMessage => {
  return {
    body: '',
    events: [
      {
        error: null,
        kind: 'usage',
        result: null,
        sortOrder: 1,
        usage,
        usageJson: null,
      },
    ],
    id: 'm',
    role: 'assistant',
  };
};

describe('ChatSessionDrawerContext', () => {
  describe('when no usage was reported', () => {
    test('renders the empty line only', () => {
      const component = render(<ChatSessionDrawerContext messages={[]} />);

      expect(
        component.getByTestId('ChatSessionDrawerContext'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('ChatSessionDrawerContext-window'),
      ).not.toBeInTheDocument();
    });
  });

  describe('with a Claude-shaped turn', () => {
    test('renders the meter, rows and last turn', () => {
      const component = render(
        <ChatSessionDrawerContext
          messages={[
            turn({
              cacheReadTokens: 10,
              contextTokens: 100000,
              contextWindowTokens: 200000,
              costUsd: 0.1,
              inputTokens: 100,
              outputTokens: 50,
            }),
          ]}
        />,
      );

      expect(component.getByRole('meter')).toHaveAttribute(
        'aria-valuenow',
        '50',
      );
      expect(
        component.getByTestId('ChatSessionDrawerContext-row-cacheRead'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('ChatSessionDrawerContext-row-cost'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('ChatSessionDrawerContext-lastTurn'),
      ).toBeInTheDocument();
    });
  });

  describe('with a Codex-shaped turn', () => {
    test('omits the meter and absent rows', () => {
      const component = render(
        <ChatSessionDrawerContext
          messages={[turn({ inputTokens: 10, outputTokens: 5 })]}
        />,
      );

      expect(component.queryByRole('meter')).not.toBeInTheDocument();
      expect(
        component.queryByTestId('ChatSessionDrawerContext-row-cacheRead'),
      ).not.toBeInTheDocument();
      expect(
        component.getByTestId('ChatSessionDrawerContext-row-input'),
      ).toBeInTheDocument();
    });
  });
});

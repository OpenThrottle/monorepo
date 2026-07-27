import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ChatUsageCounter } from '../ChatUsageCounter';

describe('ChatUsageCounter Component', () => {
  test('renders a running total of tokens and cost', () => {
    const component = render(
      <ChatUsageCounter usage={{ costUsd: 0.12, totalTokens: 12000 }} />,
    );

    const counter = component.getByTestId('ChatUsageCounter');
    expect(counter).toHaveTextContent('12k tokens · $0.12');
  });

  test('derives the total from input + output when no explicit total is present', () => {
    const component = render(
      <ChatUsageCounter usage={{ inputTokens: 1200, outputTokens: 340 }} />,
    );

    expect(component.getByTestId('ChatUsageCounter')).toHaveTextContent(
      '1.5k tokens',
    );
  });

  test('shows a live pulse dot while streaming and labels the intent', () => {
    const streaming = render(
      <ChatUsageCounter streaming={true} usage={{ totalTokens: 50 }} />,
    );
    expect(streaming.getByTestId('ChatUsageCounter-live')).toBeInTheDocument();
    expect(
      streaming.getByLabelText(/Live token usage: 50 tokens/),
    ).toBeInTheDocument();
  });

  test('reads as a conversation total (no pulse) when idle', () => {
    const idle = render(<ChatUsageCounter usage={{ totalTokens: 50 }} />);
    expect(idle.queryByTestId('ChatUsageCounter-live')).not.toBeInTheDocument();
    expect(
      idle.getByLabelText(/Conversation total: 50 tokens/),
    ).toBeInTheDocument();
  });

  test('renders nothing when no counts were reported', () => {
    const empty = render(<ChatUsageCounter usage={{}} />);
    expect(empty.container).toBeEmptyDOMElement();

    const modelOnly = render(<ChatUsageCounter usage={{ model: 'x' }} />);
    expect(modelOnly.container).toBeEmptyDOMElement();
  });

  test('renders cost alone when only a dollar cost was reported', () => {
    const component = render(<ChatUsageCounter usage={{ costUsd: 0.5 }} />);
    expect(component.getByTestId('ChatUsageCounter')).toHaveTextContent(
      '$0.500',
    );
  });
});

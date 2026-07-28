import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ChatTurnUsageSummary } from '../ChatTurnUsageSummary';
import type { ChatTurnUsageEvent } from '../../types';

const usageEvent = (
  overrides: Partial<ChatTurnUsageEvent>,
): ChatTurnUsageEvent => ({
  error: null,
  kind: 'usage',
  result: null,
  sortOrder: 0,
  usageJson: null,
  ...overrides,
});

describe('ChatTurnUsageSummary Component', () => {
  test('renders a compact badge of input/output tokens with a full breakdown aria-label', () => {
    const component = render(
      <ChatTurnUsageSummary
        event={usageEvent({
          usage: {
            cacheReadTokens: 900,
            costUsd: 0.042,
            inputTokens: 1200,
            model: 'claude-opus-4-8',
            outputTokens: 340,
            totalTokens: 1540,
          },
        })}
      />,
    );

    const badge = component.getByTestId('ChatTurnUsage');
    expect(badge).toHaveTextContent('↑ 1.2k · ↓ 340');
    const ariaLabel = badge.getAttribute('aria-label') ?? '';
    expect(ariaLabel).toContain('Input: 1.2k');
    expect(ariaLabel).toContain('Output: 340');
    expect(ariaLabel).toContain('Cache read: 900');
    expect(ariaLabel).toContain('Total: 1.5k');
    expect(ariaLabel).toContain('Cost: $0.042');
    expect(ariaLabel).toContain('Model: claude-opus-4-8');
  });

  test('falls back to the total when input/output are absent', () => {
    const component = render(
      <ChatTurnUsageSummary
        event={usageEvent({ usage: { totalTokens: 50 } })}
      />,
    );
    expect(component.getByTestId('ChatTurnUsage')).toHaveTextContent('Σ 50');
  });

  test('falls back to cost alone when only a dollar cost was reported', () => {
    const component = render(
      <ChatTurnUsageSummary event={usageEvent({ usage: { costUsd: 1.2 } })} />,
    );
    expect(component.getByTestId('ChatTurnUsage')).toHaveTextContent('$1.20');
  });

  test('renders nothing when the backend reported no counts', () => {
    const empty = render(<ChatTurnUsageSummary event={usageEvent({})} />);
    expect(empty.container).toBeEmptyDOMElement();

    const modelOnly = render(
      <ChatTurnUsageSummary event={usageEvent({ usage: { model: 'x' } })} />,
    );
    expect(modelOnly.container).toBeEmptyDOMElement();
  });

  test('surfaces a terminal error as an alert instead of a badge', () => {
    const component = render(
      <ChatTurnUsageSummary
        event={usageEvent({
          error: 'stream failed',
          usage: { inputTokens: 5 },
        })}
      />,
    );

    expect(component.getByRole('alert')).toHaveTextContent('stream failed');
    expect(component.queryByTestId('ChatTurnUsage')).not.toBeInTheDocument();
  });
});

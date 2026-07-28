import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ChatTurnTimeline } from '../ChatTurnTimeline';
import type { ChatTurnEvent } from '../../types';

const renderTimeline = (events: readonly ChatTurnEvent[]): RenderResult =>
  render(<ChatTurnTimeline events={events} />);

describe('ChatTurnTimeline Component', () => {
  test('interleaves thinking, tool, and text in sortOrder regardless of input order', () => {
    const component = renderTimeline([
      { kind: 'text', sortOrder: 30, text: 'final answer' },
      { kind: 'thinking', sortOrder: 10, text: 'let me think' },
      {
        argsJson: null,
        callId: 'c1',
        error: null,
        kind: 'tool',
        name: 'read',
        resultJson: null,
        sortOrder: 20,
        status: 'succeeded',
      },
    ]);

    const text = component.container.textContent ?? '';
    // thinking (10) -> tool (20) -> text (30)
    expect(text.indexOf('Thinking')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Thinking')).toBeLessThan(text.indexOf('read'));
    expect(text.indexOf('read')).toBeLessThan(text.indexOf('final answer'));
  });

  test('renders a markdown text segment, a thinking affordance, and a tool card', () => {
    const component = renderTimeline([
      { kind: 'thinking', sortOrder: 0, text: 'reasoning' },
      {
        argsJson: null,
        callId: 'c1',
        error: null,
        kind: 'tool',
        name: 'grep',
        resultJson: null,
        sortOrder: 1,
        status: 'running',
      },
      { kind: 'text', sortOrder: 2, text: 'here is the answer' },
    ]);

    expect(component.getByText('Thinking')).toBeInTheDocument();
    expect(component.getByText('grep')).toBeInTheDocument();
    expect(component.getByText('here is the answer')).toBeInTheDocument();
  });

  describe('turn progress', () => {
    test('shows a running indicator until the terminal usage event lands', () => {
      const component = renderTimeline([
        { kind: 'text', sortOrder: 0, text: 'streaming…' },
      ]);

      const running = component.getByTestId('ChatTurnTimeline-running');
      expect(running).toBeInTheDocument();
      // reduced-motion: the pulse must stop when the user opts out
      expect(running.querySelector('.animate-pulse')?.className).toContain(
        'motion-reduce:animate-none',
      );
    });

    test('hides the running indicator once a usage event is present', () => {
      const component = renderTimeline([
        { kind: 'text', sortOrder: 0, text: 'done' },
        {
          error: null,
          kind: 'usage',
          result: 'ok',
          sortOrder: 1,
          usageJson: JSON.stringify({ totalTokens: 12 }),
        },
      ]);

      expect(
        component.queryByTestId('ChatTurnTimeline-running'),
      ).not.toBeInTheDocument();
    });

    test('summarizes usage as a compact badge with a breakdown aria-label', () => {
      const component = renderTimeline([
        {
          error: null,
          kind: 'usage',
          result: 'ok',
          sortOrder: 0,
          usage: {
            costUsd: 0.04,
            inputTokens: 1200,
            outputTokens: 340,
            totalTokens: 1540,
          },
          usageJson: null,
        },
      ]);

      const badge = component.getByTestId('ChatTurnUsage');
      expect(badge).toHaveTextContent('↑ 1.2k');
      expect(badge).toHaveTextContent('↓ 340');
      const ariaLabel = badge.getAttribute('aria-label') ?? '';
      expect(ariaLabel).toContain('Input: 1.2k');
      expect(ariaLabel).toContain('Cost: $0.04');
    });

    test('renders nothing for a usage event with no reported counts', () => {
      const component = renderTimeline([
        { kind: 'text', sortOrder: 0, text: 'done' },
        {
          error: null,
          kind: 'usage',
          result: null,
          sortOrder: 1,
          usageJson: null,
        },
      ]);

      expect(component.queryByTestId('ChatTurnUsage')).not.toBeInTheDocument();
      // the running indicator is still hidden — a usage event is present
      expect(
        component.queryByTestId('ChatTurnTimeline-running'),
      ).not.toBeInTheDocument();
    });

    test('surfaces a terminal error as an alert instead of a usage summary', () => {
      const component = renderTimeline([
        {
          error: 'stream failed',
          kind: 'usage',
          result: null,
          sortOrder: 0,
          usageJson: null,
        },
      ]);

      expect(component.getByRole('alert')).toHaveTextContent('stream failed');
      expect(component.queryByText('Usage')).not.toBeInTheDocument();
    });
  });

  test('ignores session events (internal handle, no UI)', () => {
    const component = renderTimeline([
      { kind: 'session', sessionId: 'sess-1', sortOrder: 0 },
      { kind: 'text', sortOrder: 1, text: 'visible text' },
    ]);

    expect(component.getByText('visible text')).toBeInTheDocument();
    expect(component.container.textContent).not.toContain('sess-1');
  });
});

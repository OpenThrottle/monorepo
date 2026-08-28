import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { ChatTurnTimeline } from '../ChatTurnTimeline';
import type { ChatTurnEvent } from '../../types';

const renderTimeline = (events: readonly ChatTurnEvent[]): RenderResult =>
  render(<ChatTurnTimeline events={events} />);

describe('ChatTurnTimeline Component', () => {
  test('interleaves thinking, tool, and text in sortOrder regardless of input order', async () => {
    const user = userEvent.setup();
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

    // thinking (10) + tool (20) are adjacent, so they fold into one activity
    // row that sits before the text segment (30). Expand to see the order.
    await user.click(component.getByTestId('ChatActivityGroup-trigger'));

    // Read the expanded body only — the collapsed header repeats the tool name.
    const body =
      component.getByTestId('ChatActivityGroup-content').textContent ?? '';
    expect(body.indexOf('Thinking')).toBeGreaterThanOrEqual(0);
    expect(body.indexOf('Thinking')).toBeLessThan(body.indexOf('read'));

    const text = component.container.textContent ?? '';
    expect(text.indexOf('read')).toBeLessThan(text.indexOf('final answer'));
  });

  test('folds an adjacent thinking + tool run into one collapsed activity row', () => {
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

    const trigger = component.getByTestId('ChatActivityGroup-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // the header stays informative while collapsed: active tool + live counts
    expect(trigger).toHaveTextContent('grep');
    expect(trigger).toHaveTextContent('1 tool call');
    expect(trigger).toHaveTextContent('1 thinking step');
    expect(trigger).toHaveTextContent('running');
    // prose is never folded away
    expect(component.getByText('here is the answer')).toBeInTheDocument();
  });

  test('a lone tool run renders as a bare card, not nested in an activity row', () => {
    const component = renderTimeline([
      {
        argsJson: null,
        callId: 'c1',
        error: null,
        kind: 'tool',
        name: 'grep',
        resultJson: null,
        sortOrder: 0,
        status: 'succeeded',
      },
      { kind: 'text', sortOrder: 1, text: 'done' },
    ]);

    expect(
      component.queryByTestId('ChatActivityGroup'),
    ).not.toBeInTheDocument();
    expect(component.getByTestId('ChatToolCall')).toBeInTheDocument();
  });

  test('text breaks the fold into separate activity rows', () => {
    const component = renderTimeline([
      { kind: 'thinking', sortOrder: 0, text: 'first' },
      {
        argsJson: null,
        callId: 'c1',
        error: null,
        kind: 'tool',
        name: 'read',
        resultJson: null,
        sortOrder: 1,
        status: 'succeeded',
      },
      { kind: 'text', sortOrder: 2, text: 'interim answer' },
      { kind: 'thinking', sortOrder: 3, text: 'second' },
      {
        argsJson: null,
        callId: 'c2',
        error: null,
        kind: 'tool',
        name: 'edit',
        resultJson: null,
        sortOrder: 4,
        status: 'succeeded',
      },
    ]);

    expect(component.getAllByTestId('ChatActivityGroup')).toHaveLength(2);
  });

  test('a failed nested tool turns the collapsed activity header red', () => {
    const component = renderTimeline([
      { kind: 'thinking', sortOrder: 0, text: 'reasoning' },
      {
        argsJson: null,
        callId: 'c1',
        error: 'boom',
        kind: 'tool',
        name: 'shell',
        resultJson: null,
        sortOrder: 1,
        status: 'failed',
      },
    ]);

    const trigger = component.getByTestId('ChatActivityGroup-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('failed');
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

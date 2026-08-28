import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { ChatActivityGroup } from '../ChatActivityGroup';
import type { ChatActivityGroupProps } from '../ChatActivityGroup';
import { buildTurnTimeline, foldTurnActivity } from '../../turn-tool-groups';
import type { TurnTimelineActivityGroup } from '../../turn-tool-groups';
import type { ChatTurnEvent, ChatTurnToolEvent } from '../../types';

const tool = (
  overrides: Partial<ChatTurnToolEvent> = {},
): ChatTurnToolEvent => ({
  argsJson: null,
  callId: null,
  error: null,
  kind: 'tool',
  name: 'read',
  resultJson: null,
  sortOrder: 0,
  status: 'succeeded',
  ...overrides,
});

const thinking = (sortOrder: number, text = 'hmm'): ChatTurnEvent => ({
  kind: 'thinking',
  sortOrder,
  text,
});

/** Build the group the way the timeline does, so the fold stays the contract. */
const groupOf = (
  events: readonly ChatTurnEvent[],
): TurnTimelineActivityGroup => {
  const [slot] = foldTurnActivity(buildTurnTimeline(events));
  if (slot === undefined || slot.kind !== 'activity') {
    throw new Error('expected the events to fold into one activity group');
  }
  return slot;
};

const renderGroup = (props: ChatActivityGroupProps): RenderResult =>
  render(<ChatActivityGroup {...props} />);

describe('ChatActivityGroup Component', () => {
  test('starts collapsed and hides the nested sequence', () => {
    const component = renderGroup({
      group: groupOf([tool({ sortOrder: 0 }), thinking(1)]),
    });

    expect(component.getByTestId('ChatActivityGroup-trigger')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(component.queryByTestId('ChatToolCall')).not.toBeInTheDocument();
    expect(
      component.queryByTestId('ChatThinkingBlock'),
    ).not.toBeInTheDocument();
  });

  test('stays collapsed while the run is still streaming', () => {
    // The header carries live progress, so there is no reason to shove the
    // reader down the page mid-run.
    const component = renderGroup({
      group: groupOf([
        tool({ name: 'a', sortOrder: 0 }),
        thinking(1),
        tool({ name: 'shell', sortOrder: 2, status: 'running' }),
      ]),
    });

    const trigger = component.getByTestId('ChatActivityGroup-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('shell');
    expect(trigger).toHaveTextContent('running');
  });

  test('summarizes tool and thinking counts in the collapsed header', () => {
    const component = renderGroup({
      group: groupOf([
        tool({ name: 'a', sortOrder: 0 }),
        tool({ name: 'b', sortOrder: 1 }),
        thinking(2),
        tool({ name: 'c', sortOrder: 3 }),
        thinking(4),
      ]),
    });

    const trigger = component.getByTestId('ChatActivityGroup-trigger');
    expect(trigger).toHaveTextContent('3 tool calls');
    expect(trigger).toHaveTextContent('2 thinking steps');
  });

  test('singularizes the counts', () => {
    const component = renderGroup({
      group: groupOf([tool({ sortOrder: 0 }), thinking(1)]),
    });

    const trigger = component.getByTestId('ChatActivityGroup-trigger');
    expect(trigger).toHaveTextContent('1 tool call');
    expect(trigger).toHaveTextContent('1 thinking step');
    expect(trigger).not.toHaveTextContent('tool calls');
  });

  test('omits the thinking count when the run is all tools', () => {
    const component = renderGroup({
      group: groupOf([
        tool({ name: 'a', sortOrder: 0 }),
        thinking(1, '   '),
        tool({ name: 'b', sortOrder: 2 }),
      ]),
    });

    const trigger = component.getByTestId('ChatActivityGroup-trigger');
    expect(trigger).toHaveTextContent('2 tool calls');
    expect(trigger).not.toHaveTextContent('thinking');
  });

  test('a failed nested tool propagates a failed pill to the collapsed header', () => {
    const component = renderGroup({
      group: groupOf([
        tool({ name: 'a', sortOrder: 0 }),
        thinking(1),
        tool({ error: 'boom', name: 'b', sortOrder: 2, status: 'failed' }),
      ]),
    });

    const trigger = component.getByTestId('ChatActivityGroup-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('failed');
  });

  test('expanding reveals the interleaved tools and thinking in order', async () => {
    const user = userEvent.setup();
    const component = renderGroup({
      group: groupOf([
        tool({ name: 'first', sortOrder: 0 }),
        thinking(1, 'middle reasoning'),
        tool({ name: 'second', sortOrder: 2 }),
      ]),
    });

    await user.click(component.getByTestId('ChatActivityGroup-trigger'));

    expect(component.getAllByTestId('ChatToolCall')).toHaveLength(2);
    expect(component.getByTestId('ChatThinkingBlock')).toBeInTheDocument();

    // Read the expanded body only — the header repeats the active tool name.
    const body =
      component.getByTestId('ChatActivityGroup-content').textContent ?? '';
    expect(body.indexOf('first')).toBeLessThan(body.indexOf('Thinking'));
    expect(body.indexOf('Thinking')).toBeLessThan(body.indexOf('second'));
  });

  test('a nested run of consecutive tools stays folded as its own group', async () => {
    const user = userEvent.setup();
    const component = renderGroup({
      group: groupOf([
        tool({ name: 'a', sortOrder: 0 }),
        tool({ name: 'b', sortOrder: 1 }),
        thinking(2),
      ]),
    });

    await user.click(component.getByTestId('ChatActivityGroup-trigger'));

    const nested = component.getByTestId('ChatToolCallGroup-trigger');
    expect(nested).toHaveTextContent('· 2 actions');
    expect(nested).toHaveAttribute('aria-expanded', 'false');
  });

  test('a caller can opt the run open', () => {
    const component = renderGroup({
      defaultOpen: true,
      group: groupOf([tool({ sortOrder: 0 }), thinking(1)]),
    });

    expect(component.getByTestId('ChatActivityGroup-trigger')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});

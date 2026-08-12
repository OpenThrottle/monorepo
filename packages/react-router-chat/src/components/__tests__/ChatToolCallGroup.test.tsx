import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { ChatToolCallGroup } from '../ChatToolCallGroup';
import type { ChatToolCallGroupProps } from '../ChatToolCallGroup';
import type { ChatTurnToolEvent } from '../../types';

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

const renderGroup = (props: ChatToolCallGroupProps): RenderResult =>
  render(<ChatToolCallGroup {...props} />);

describe('ChatToolCallGroup Component', () => {
  test('summarizes the count and the active (running) step in the header', () => {
    const component = renderGroup({
      tools: [
        tool({ name: 'getMcpTools', sortOrder: 0, status: 'succeeded' }),
        tool({ name: 'shell', sortOrder: 1, status: 'running' }),
      ],
    });

    // The group is expanded while running, so `shell`/`running` also appear in
    // the member cards — assert against the header (trigger) specifically.
    const trigger = component.getByTestId('ChatToolCallGroup-trigger');
    expect(trigger).toHaveTextContent('shell');
    expect(trigger).toHaveTextContent('· 2 actions');
    // aggregate is running while a member is still running
    expect(trigger).toHaveTextContent('running');
  });

  test('a completed group shows a succeeded pill and the last step', () => {
    const component = renderGroup({
      tools: [
        tool({ name: 'getMcpTools', sortOrder: 0, status: 'succeeded' }),
        tool({ name: 'shell', sortOrder: 1, status: 'succeeded' }),
      ],
    });

    expect(component.getByText('shell')).toBeInTheDocument();
    expect(component.getByText('succeeded')).toBeInTheDocument();
  });

  test('a failed member surfaces a failed aggregate pill', () => {
    const component = renderGroup({
      tools: [
        tool({ name: 'a', sortOrder: 0, status: 'succeeded' }),
        tool({ error: 'boom', name: 'b', sortOrder: 1, status: 'failed' }),
      ],
    });

    expect(component.getByText('failed')).toBeInTheDocument();
  });

  test('starts collapsed when done and expands to reveal member cards on click', async () => {
    const user = userEvent.setup();
    const component = renderGroup({
      tools: [
        tool({ name: 'first', sortOrder: 0, status: 'succeeded' }),
        tool({ name: 'second', sortOrder: 1, status: 'succeeded' }),
      ],
    });

    const trigger = component.getByTestId('ChatToolCallGroup-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(component.getAllByTestId('ChatToolCall')).toHaveLength(2);
  });

  test('starts expanded while running', () => {
    const component = renderGroup({
      tools: [
        tool({ name: 'a', sortOrder: 0, status: 'succeeded' }),
        tool({ name: 'b', sortOrder: 1, status: 'running' }),
      ],
    });

    expect(component.getByTestId('ChatToolCallGroup-trigger')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});

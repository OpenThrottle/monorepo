import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { ChatQueuedMessagesProps } from '../ChatQueuedMessages';
import { ChatQueuedMessages } from '../ChatQueuedMessages';

const ITEMS = [
  { fields: {}, id: 'q1', message: 'first' },
  { fields: {}, id: 'q2', message: 'second' },
];

const renderQueue = (
  overrides: Partial<ChatQueuedMessagesProps> = {},
): RenderResult => {
  return render(
    <ChatQueuedMessages
      isPaused={false}
      items={ITEMS}
      onClear={vi.fn()}
      onEdit={vi.fn()}
      onRemove={vi.fn()}
      onResume={vi.fn()}
      onSendNow={vi.fn()}
      {...overrides}
    />,
  );
};

describe('ChatQueuedMessages Component', () => {
  test('renders nothing when the queue is empty', () => {
    const component = renderQueue({ items: [] });

    expect(component.queryByTestId('ChatQueuedMessages')).toBeNull();
  });

  test('lists queued messages in order', () => {
    const component = renderQueue();

    const rows = component.getAllByTestId('ChatQueuedMessageRow');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('first');
    expect(rows[1]).toHaveTextContent('second');
  });

  describe('when not paused', () => {
    test('offers Clear but not Resume', async () => {
      const onClear = vi.fn();
      const user = userEvent.setup();
      const component = renderQueue({ onClear });

      expect(
        component.queryByRole('button', { name: 'Resume' }),
      ).not.toBeInTheDocument();
      await user.click(component.getByRole('button', { name: 'Clear' }));
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('when paused', () => {
    test('offers Resume', async () => {
      const onResume = vi.fn();
      const user = userEvent.setup();
      const component = renderQueue({ isPaused: true, onResume });

      await user.click(component.getByRole('button', { name: 'Resume' }));
      expect(onResume).toHaveBeenCalledTimes(1);
    });
  });

  test('passes a row action through with its message id', async () => {
    const onSendNow = vi.fn();
    const user = userEvent.setup();
    const component = renderQueue({ onSendNow });

    const sendButtons = component.getAllByRole('button', { name: 'Send now' });
    await user.click(sendButtons[1]!);
    expect(onSendNow).toHaveBeenCalledWith('q2');
  });
});

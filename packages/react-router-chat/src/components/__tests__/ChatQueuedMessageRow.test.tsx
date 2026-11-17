import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { ChatQueuedMessageRowProps } from '../ChatQueuedMessageRow';
import { ChatQueuedMessageRow } from '../ChatQueuedMessageRow';

const renderRow = (
  overrides: Partial<ChatQueuedMessageRowProps> = {},
): RenderResult => {
  return render(
    <ol>
      <ChatQueuedMessageRow
        item={{ fields: {}, id: 'q1', message: 'check vercel' }}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
        onSendNow={vi.fn()}
        {...overrides}
      />
    </ol>,
  );
};

describe('ChatQueuedMessageRow Component', () => {
  test('shows the message text', () => {
    const component = renderRow();

    expect(component.getByTestId('ChatQueuedMessageRow')).toHaveTextContent(
      'check vercel',
    );
  });

  test('Send now and Remove report the message id', async () => {
    const onRemove = vi.fn();
    const onSendNow = vi.fn();
    const user = userEvent.setup();
    const component = renderRow({ onRemove, onSendNow });

    await user.click(component.getByRole('button', { name: 'Send now' }));
    await user.click(
      component.getByRole('button', { name: 'Remove queued message' }),
    );

    expect(onSendNow).toHaveBeenCalledWith('q1');
    expect(onRemove).toHaveBeenCalledWith('q1');
  });

  describe('when editing', () => {
    test('Enter saves the edited text', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup();
      const component = renderRow({ onEdit });

      await user.click(
        component.getByRole('button', { name: 'Edit queued message' }),
      );
      const input = component.getByRole('textbox', { name: 'Queued message' });
      await user.clear(input);
      await user.type(input, 'check vercel logs{Enter}');

      expect(onEdit).toHaveBeenCalledWith('q1', 'check vercel logs');
      expect(
        component.queryByRole('textbox', { name: 'Queued message' }),
      ).not.toBeInTheDocument();
    });

    test('Escape cancels without saving', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup();
      const component = renderRow({ onEdit });

      await user.click(
        component.getByRole('button', { name: 'Edit queued message' }),
      );
      await user.type(
        component.getByRole('textbox', { name: 'Queued message' }),
        ' more{Escape}',
      );

      expect(onEdit).not.toHaveBeenCalled();
      expect(component.getByTestId('ChatQueuedMessageRow')).toHaveTextContent(
        'check vercel',
      );
    });
  });
});

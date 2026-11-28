import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { ChatMessageAttachments } from '../ChatMessageAttachments';

const make = (id: string) => {
  return {
    byteSize: null,
    height: null,
    id,
    mimeType: null,
    originalName: null,
    width: null,
  };
};

describe('ChatMessageAttachments', () => {
  test('renders nothing without attachments', () => {
    const component = render(
      <ChatMessageAttachments attachments={undefined} />,
    );

    expect(component.queryByRole('list')).not.toBeInTheDocument();
  });

  test('renders one thumbnail per attachment', () => {
    const component = render(
      <ChatMessageAttachments attachments={[make('a'), make('b')]} />,
    );

    expect(component.getAllByRole('img')).toHaveLength(2);
  });

  test('opens the clicked image in a dialog, steps with arrow keys and returns focus', async () => {
    const user = userEvent.setup();
    const component = render(
      <ChatMessageAttachments
        attachments={[
          { ...make('a'), originalName: 'one.png' },
          { ...make('b'), originalName: 'two.png' },
        ]}
      />,
    );
    const thumbnail = component.getByRole('button', { name: 'two.png' });

    await user.click(thumbnail);
    await waitFor(() => {
      expect(
        component.getByRole('dialog', { name: 'two.png' }),
      ).toBeInTheDocument();
    });

    await user.keyboard('{ArrowRight}');
    await waitFor(() => {
      expect(
        component.getByRole('dialog', { name: 'one.png' }),
      ).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(thumbnail).toHaveFocus();
    });
  });
});

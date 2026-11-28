import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { ChatMessageAttachment as Attachment } from '../../types';
import { ChatMessageAttachment } from '../ChatMessageAttachment';

const attachment: Attachment = {
  byteSize: 10,
  height: 20,
  id: 'att-1',
  mimeType: 'image/png',
  originalName: 'shot.png',
  width: 30,
};

describe('ChatMessageAttachment', () => {
  test('renders the served thumbnail inside a button that asks to open', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const component = render(
      <ChatMessageAttachment attachment={attachment} onOpen={onOpen} />,
    );

    expect(component.getByRole('img', { name: 'shot.png' })).toHaveAttribute(
      'src',
      '/resources/attachments/att-1',
    );
    expect(component.queryByRole('link')).not.toBeInTheDocument();

    await user.click(component.getByRole('button', { name: 'shot.png' }));

    await waitFor(() => {
      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(onOpen).toHaveBeenCalledWith(
        component.getByRole('button', { name: 'shot.png' }),
      );
    });
  });

  test('swaps in a non-interactive missing-image placeholder when the image fails to load', () => {
    const component = render(
      <ChatMessageAttachment attachment={attachment} onOpen={vi.fn()} />,
    );

    const image = component.getByRole('img', { name: 'shot.png' });
    act(() => {
      image.dispatchEvent(new Event('error'));
    });

    expect(
      component.getByRole('img', { name: 'Image unavailable' }),
    ).toBeInTheDocument();
    expect(component.queryByRole('button')).not.toBeInTheDocument();
    expect(component.queryByRole('link')).not.toBeInTheDocument();
  });
});

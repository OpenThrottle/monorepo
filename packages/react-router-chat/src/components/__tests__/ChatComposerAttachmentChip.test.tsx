import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { ChatComposerAttachment } from '../../types';
import { ChatComposerAttachmentChip } from '../ChatComposerAttachmentChip';

const base = { localId: 'a-1', name: 'shot.png', previewUrl: 'blob:shot' };

describe('ChatComposerAttachmentChip', () => {
  test('shows the thumbnail and name of a ready attachment', () => {
    const attachment: ChatComposerAttachment = { ...base, status: 'ready' };
    const component = render(
      <ChatComposerAttachmentChip attachment={attachment} onRemove={vi.fn()} />,
    );

    expect(component.getByRole('img', { name: 'shot.png' })).toHaveAttribute(
      'src',
      'blob:shot',
    );
    expect(component.queryByRole('status')).not.toBeInTheDocument();
  });

  test('shows a spinner while uploading', () => {
    const attachment: ChatComposerAttachment = { ...base, status: 'uploading' };
    const component = render(
      <ChatComposerAttachmentChip attachment={attachment} onRemove={vi.fn()} />,
    );

    expect(component.getByRole('status', { name: 'Uploading' })).toBeVisible();
  });

  test('shows the error message and stays removable', async () => {
    const onRemove = vi.fn();
    const attachment: ChatComposerAttachment = {
      ...base,
      error: 'Image is too large',
      status: 'error',
    };
    const component = render(
      <ChatComposerAttachmentChip
        attachment={attachment}
        onRemove={onRemove}
      />,
    );

    expect(component.getByRole('alert')).toHaveTextContent(
      'Image is too large',
    );

    await userEvent
      .setup()
      .click(component.getByRole('button', { name: 'Remove shot.png' }));

    expect(onRemove).toHaveBeenCalledWith('a-1');
  });
});

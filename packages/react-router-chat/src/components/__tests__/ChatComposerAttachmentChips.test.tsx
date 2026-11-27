import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { ChatComposerAttachmentChips } from '../ChatComposerAttachmentChips';

describe('ChatComposerAttachmentChips', () => {
  test('renders nothing without attachments', () => {
    const component = render(
      <ChatComposerAttachmentChips attachments={[]} onRemove={vi.fn()} />,
    );

    expect(component.queryByRole('list')).not.toBeInTheDocument();
  });

  test('renders one chip per attachment in order', () => {
    const component = render(
      <ChatComposerAttachmentChips
        attachments={[
          {
            localId: '1',
            name: 'a.png',
            previewUrl: 'blob:a',
            status: 'ready',
          },
          {
            localId: '2',
            name: 'b.png',
            previewUrl: 'blob:b',
            status: 'uploading',
          },
        ]}
        onRemove={vi.fn()}
      />,
    );

    const items = component.getAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute('data-status', 'ready');
    expect(items[1]).toHaveAttribute('data-status', 'uploading');
  });
});

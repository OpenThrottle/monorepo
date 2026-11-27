import { act, render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

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
  test('renders the served thumbnail as a link that opens in a new tab', () => {
    const component = render(<ChatMessageAttachment attachment={attachment} />);

    expect(component.getByRole('img', { name: 'shot.png' })).toHaveAttribute(
      'src',
      '/resources/attachments/att-1',
    );
    expect(component.getByRole('link')).toHaveAttribute('target', '_blank');
  });

  test('swaps in a missing-image placeholder when the image fails to load', () => {
    const component = render(<ChatMessageAttachment attachment={attachment} />);

    const image = component.getByRole('img', { name: 'shot.png' });
    act(() => {
      image.dispatchEvent(new Event('error'));
    });

    expect(
      component.getByRole('img', { name: 'Image unavailable' }),
    ).toBeInTheDocument();
    expect(component.queryByRole('link')).not.toBeInTheDocument();
  });
});

import { render } from '@testing-library/react';
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
});

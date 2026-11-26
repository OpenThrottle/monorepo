import { DndContext } from '@dnd-kit/core';
import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { ChatConversationUngroupDropZone } from '../ChatConversationUngroupDropZone';

describe('ChatConversationUngroupDropZone', () => {
  test('renders nothing while no row is being dragged', () => {
    const component = render(
      <DndContext>
        <ChatConversationUngroupDropZone enabled={true} />
      </DndContext>,
    );

    expect(
      component.queryByTestId('ChatConversationSidebar-ungroup-drop-zone'),
    ).not.toBeInTheDocument();
  });

  test('renders nothing outside a drag-and-drop context (no grouping)', () => {
    const component = render(
      <ChatConversationUngroupDropZone enabled={true} />,
    );

    expect(
      component.queryByTestId('ChatConversationSidebar-ungroup-drop-zone'),
    ).not.toBeInTheDocument();
  });
});

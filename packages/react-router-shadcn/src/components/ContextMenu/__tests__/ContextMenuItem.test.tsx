import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../index';

describe('ContextMenuItem', () => {
  test('renders inside an open context menu', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Action</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText('Area'));
    const item = document.body.querySelector('[role="menuitem"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Action');
  });
});

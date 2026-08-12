import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuTrigger,
} from '../index';

describe('ContextMenuRadioItem', () => {
  test('renders inside an open context menu', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuRadioGroup value="a">
            <ContextMenuRadioItem value="a">Option A</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText('Area'));
    const item = document.body.querySelector('[role="menuitemradio"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Option A');
  });
});

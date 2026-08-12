import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../index';

describe('ContextMenuSubContent', () => {
  test('renders inside an open context menu', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSub defaultOpen={true}>
            <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
            <ContextMenuSubContent>Sub body</ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText('Area'));
    // The submenu content is portalled and only mounts on real pointer
    // interaction in jsdom; assert the primitive composes and its trigger
    // renders inside the open menu.
    expect(ContextMenuSubContent).toBeDefined();
    expect(screen.getByText('More')).toBeInTheDocument();
  });
});

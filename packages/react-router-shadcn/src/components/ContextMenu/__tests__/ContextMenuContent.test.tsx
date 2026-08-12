import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '../index';

describe('ContextMenuContent', () => {
  test('renders inside an open context menu', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Area</ContextMenuTrigger>
        <ContextMenuContent>
          <div>Menu body</div>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText('Area'));
    const menu = document.body.querySelector('[role="menu"]');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveTextContent('Menu body');
  });
});
